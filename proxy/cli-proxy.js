#!/usr/bin/env node
'use strict';

// =============================================================================
// kodizm CLI proxy — persistent Unix socket bridge to Claude CLI
//
// Spawns the CLI once, keeps it alive across turns. Each Unix socket connection
// represents one conversational turn: write NDJSON message in, stream NDJSON
// events out until `"type":"result"` signals turn completion.
//
// Usage:
//   node cli-proxy.js \
//     --cmd "claude --input-format stream-json --output-format stream-json --verbose" \
//     --socket /tmp/kodizm-cli.sock \
//     --idle-timeout 300 \
//     --cwd /workspace
// =============================================================================

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    cmd: 'claude --input-format stream-json --output-format stream-json --verbose',
    socket: '/tmp/kodizm-cli.sock',
    idleTimeout: 300,
    cwd: null,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--cmd':
        args.cmd = argv[++i];
        break;
      case '--socket':
        args.socket = argv[++i];
        break;
      case '--idle-timeout':
        args.idleTimeout = parseInt(argv[++i], 10);
        break;
      case '--cwd':
        args.cwd = argv[++i];
        break;
    }
  }

  return args;
}

const config = parseArgs(process.argv);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let cliProcess = null;
let cliAlive = false;
let activeConnection = null;
let idleTimer = null;
let stdoutRl = null;
let pendingQueue = [];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  const ts = new Date().toISOString();
  process.stderr.write(`[cli-proxy ${ts}] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Idle timeout management
// ---------------------------------------------------------------------------

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);

  if (config.idleTimeout > 0) {
    idleTimer = setTimeout(() => {
      log(`Idle timeout (${config.idleTimeout}s) reached — shutting down`);
      shutdown(0);
    }, config.idleTimeout * 1000);
    // Allow process to exit naturally if only the timer is keeping it alive
    idleTimer.unref();
  }
}

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

// ---------------------------------------------------------------------------
// CLI process lifecycle
// ---------------------------------------------------------------------------

function spawnCli() {
  // Spawn via shell so escapeshellarg() quotes from PHP are interpreted correctly.
  // Direct spawn() + split(/\s+/) would pass literal quotes as part of arguments
  // and break multi-word values (e.g. --append-system-prompt 'long text').
  const opts = {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  };

  if (config.cwd) {
    opts.cwd = config.cwd;
  }

  log(`Spawning CLI: ${config.cmd} (cwd: ${config.cwd || 'inherited'})`);

  cliProcess = spawn(config.cmd, [], opts);
  cliAlive = true;

  log(`CLI spawned — PID ${cliProcess.pid}`);

  // Readline on stdout for line-buffered NDJSON parsing.
  // A single stdout chunk may contain multiple NDJSON lines; readline handles
  // buffering and splitting correctly.
  stdoutRl = readline.createInterface({ input: cliProcess.stdout });

  stdoutRl.on('line', (line) => {
    if (!activeConnection || activeConnection.destroyed) return;

    // Forward every line to the active connection
    activeConnection.write(line + '\n');

    // Detect turn boundary
    if (line.includes('"type":"result"') || line.includes('"type": "result"')) {
      log('Result event received — turn complete');
      const conn = activeConnection;
      activeConnection = null;
      conn.end();
      drainQueue();
      resetIdleTimer();
    }
  });

  // CLI stderr → proxy stderr (debugging)
  cliProcess.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  cliProcess.on('exit', (code, signal) => {
    log(`CLI exited — code=${code} signal=${signal}`);
    cliAlive = false;
    cliProcess = null;

    if (stdoutRl) {
      stdoutRl.close();
      stdoutRl = null;
    }

    // If a connection was active during crash, send error and close
    if (activeConnection && !activeConnection.destroyed) {
      const errPayload = JSON.stringify({
        type: 'error',
        error: `CLI process exited unexpectedly (code=${code}, signal=${signal})`,
      });
      activeConnection.write(errPayload + '\n');
      activeConnection.end();
      activeConnection = null;
    }

    // Reject all queued connections — they'll reconnect and trigger re-spawn
    while (pendingQueue.length > 0) {
      const queued = pendingQueue.shift();
      if (!queued.destroyed) {
        queued.write(JSON.stringify({ type: 'error', error: 'CLI process died' }) + '\n');
        queued.end();
      }
    }
  });

  cliProcess.on('error', (err) => {
    log(`CLI spawn error: ${err.message}`);
    cliAlive = false;
    cliProcess = null;
  });
}

function ensureCli() {
  if (!cliAlive || !cliProcess) {
    spawnCli();
  }
}

// ---------------------------------------------------------------------------
// Connection queue
// ---------------------------------------------------------------------------

function drainQueue() {
  if (activeConnection) return;
  if (pendingQueue.length === 0) return;

  const next = pendingQueue.shift();
  if (next.destroyed) {
    drainQueue();
    return;
  }

  handleTurn(next);
}

// ---------------------------------------------------------------------------
// Mid-turn connection handler — triage control_response vs regular messages
// ---------------------------------------------------------------------------

function handleMidTurnConnection(conn) {
  const connRl = readline.createInterface({ input: conn });
  let lineRead = false;

  connRl.on('line', (line) => {
    if (lineRead) return;
    lineRead = true;
    connRl.close();

    // Attempt to parse and check for control_response
    let parsed = null;
    try {
      parsed = JSON.parse(line);
    } catch (_) {
      log(`Warning: malformed JSON on mid-turn connection — queuing`);
      conn._preReadMessage = line;
      pendingQueue.push(conn);
      return;
    }

    if (parsed && parsed.type === 'control_response') {
      const requestId = parsed.response?.request_id || parsed.request_id || 'unknown';
      log(`control_response forwarded to CLI stdin (request_id: ${requestId})`);
      cliProcess.stdin.write(line + '\n');
      conn.write(JSON.stringify({ type: 'ack', request_id: requestId }) + '\n');
      conn.end();
      return;
    }

    // Not a control_response — queue with pre-read message preserved
    log('Turn in progress — queuing connection (message pre-read)');
    conn._preReadMessage = line;
    pendingQueue.push(conn);
  });

  connRl.on('close', () => {
    if (!lineRead) {
      // Connection closed before sending anything — just drop it
      log('Mid-turn connection closed before sending a message');
    }
  });

  conn.on('error', (err) => {
    log(`Mid-turn connection error: ${err.message}`);
    const idx = pendingQueue.indexOf(conn);
    if (idx !== -1) pendingQueue.splice(idx, 1);
  });

  conn.on('close', () => {
    if (!lineRead) return;
    const idx = pendingQueue.indexOf(conn);
    if (idx !== -1) pendingQueue.splice(idx, 1);
  });
}

// ---------------------------------------------------------------------------
// Turn handler — one connection = one turn
// ---------------------------------------------------------------------------

function handleTurn(conn) {
  activeConnection = conn;
  clearIdleTimer();

  ensureCli();

  // If this connection had its first message pre-read (mid-turn triage),
  // use that message directly instead of reading from the stream again.
  if (conn._preReadMessage) {
    const line = conn._preReadMessage;
    delete conn._preReadMessage;

    if (!cliAlive || !cliProcess) {
      conn.write(JSON.stringify({ type: 'error', error: 'CLI process not available' }) + '\n');
      conn.end();
      activeConnection = null;
      drainQueue();
      resetIdleTimer();
      return;
    }

    log(`Sending pre-read message to CLI (${line.length} bytes)`);
    cliProcess.stdin.write(line + '\n');
    return;
  }

  // Read exactly one NDJSON line from the connection and pipe it to CLI stdin
  const connRl = readline.createInterface({ input: conn });
  let messageSent = false;

  connRl.on('line', (line) => {
    if (messageSent) return; // Only accept one message per turn
    messageSent = true;
    connRl.close();

    if (!cliAlive || !cliProcess) {
      conn.write(JSON.stringify({ type: 'error', error: 'CLI process not available' }) + '\n');
      conn.end();
      activeConnection = null;
      drainQueue();
      resetIdleTimer();
      return;
    }

    log(`Sending message to CLI (${line.length} bytes)`);
    cliProcess.stdin.write(line + '\n');
  });

  connRl.on('close', () => {
    if (!messageSent && activeConnection === conn) {
      log('Connection closed before sending a message');
      activeConnection = null;
      drainQueue();
      resetIdleTimer();
    }
  });

  conn.on('error', (err) => {
    log(`Connection error: ${err.message}`);
    if (activeConnection === conn) {
      activeConnection = null;
      drainQueue();
      resetIdleTimer();
    }
  });
}

// ---------------------------------------------------------------------------
// Socket server
// ---------------------------------------------------------------------------

function cleanupSocket() {
  try {
    if (fs.existsSync(config.socket)) {
      fs.unlinkSync(config.socket);
    }
  } catch (_) {
    // Ignore cleanup errors
  }
}

const server = net.createServer((conn) => {
  log('New connection');

  if (activeConnection) {
    log('Turn in progress — triaging mid-turn connection');
    handleMidTurnConnection(conn);
    return;
  }

  handleTurn(conn);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log(`Socket ${config.socket} already in use — removing stale socket`);
    cleanupSocket();
    server.listen(config.socket);
    return;
  }
  log(`Server error: ${err.message}`);
  process.exit(1);
});

// Ensure socket directory exists
const socketDir = path.dirname(config.socket);
if (!fs.existsSync(socketDir)) {
  fs.mkdirSync(socketDir, { recursive: true });
}

cleanupSocket();

server.listen(config.socket, () => {
  log(`Listening on ${config.socket}`);
  log(`CLI command: ${config.cmd}`);
  log(`Idle timeout: ${config.idleTimeout}s`);
  resetIdleTimer();
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(code) {
  log('Shutting down...');
  clearIdleTimer();

  server.close();

  if (cliProcess && cliAlive) {
    cliProcess.kill('SIGTERM');

    // Force kill after 5s if CLI child is still alive
    const forceKill = setTimeout(() => {
      if (cliProcess) {
        cliProcess.kill('SIGKILL');
      }
      cleanupSocket();
      process.exit(code ?? 0);
    }, 5000);

    // Exit as soon as the CLI child dies naturally
    cliProcess.on('exit', () => {
      clearTimeout(forceKill);
      cleanupSocket();
      process.exit(code ?? 0);
    });

    return;
  }

  cleanupSocket();
  process.exit(code ?? 0);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  log(err.stack);
  shutdown(1);
});
