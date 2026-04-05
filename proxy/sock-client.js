#!/usr/bin/env node
'use strict';

// =============================================================================
// kodizm socket client — connects to cli-proxy, sends one NDJSON message,
// streams response lines to stdout until a result event, then exits.
//
// Usage:
//   echo '{"type":"user","message":{"role":"user","content":"say hi"}}' \
//     | node sock-client.js /tmp/kodizm-cli.sock
// =============================================================================

const net = require('net');
const readline = require('readline');

const socketPath = process.argv[2] || '/tmp/kodizm-cli.sock';

// Read one line from stdin (the NDJSON message to send)
const stdinRl = readline.createInterface({ input: process.stdin });

let messageSent = false;

stdinRl.on('line', (line) => {
  if (messageSent) return;
  messageSent = true;
  stdinRl.close();

  const conn = net.createConnection(socketPath, () => {
    conn.write(line + '\n');
  });

  const responseRl = readline.createInterface({ input: conn });

  responseRl.on('line', (responseLine) => {
    process.stdout.write(responseLine + '\n');

    if (responseLine.includes('"type":"result"') || responseLine.includes('"type": "result"')) {
      conn.destroy();
      process.exit(0);
    }
  });

  conn.on('error', (err) => {
    process.stderr.write(`Connection error: ${err.message}\n`);
    process.exit(1);
  });

  conn.on('close', () => {
    // Server closed the connection (turn complete or error)
    process.exit(0);
  });
});

stdinRl.on('close', () => {
  if (!messageSent) {
    process.stderr.write('No input received on stdin\n');
    process.exit(1);
  }
});
