#!/bin/bash
set -euo pipefail

# Switch Python version if requested
if [[ -n "${KODIZM_ENV_PYTHON_VERSION:-}" ]]; then
    current=$(python3 --version 2>/dev/null | awk '{print $2}' | cut -d. -f1,2) || current=""
    if [[ "$current" != "$KODIZM_ENV_PYTHON_VERSION" ]]; then
        echo "Switching Python to ${KODIZM_ENV_PYTHON_VERSION}..."
        pyenv global "$KODIZM_ENV_PYTHON_VERSION" || echo "  Warning: Python ${KODIZM_ENV_PYTHON_VERSION} not available"
    fi
fi

# Switch Node version if requested
if [[ -n "${KODIZM_ENV_NODE_VERSION:-}" ]]; then
    current=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1) || current=""
    if [[ "$current" != "$KODIZM_ENV_NODE_VERSION" ]]; then
        echo "Switching Node to ${KODIZM_ENV_NODE_VERSION}..."
        # shellcheck source=/dev/null
        . "$NVM_DIR/nvm.sh" && nvm use "$KODIZM_ENV_NODE_VERSION" || echo "  Warning: Node ${KODIZM_ENV_NODE_VERSION} not available"
    fi
fi

# Switch Rust version if requested
if [[ -n "${KODIZM_ENV_RUST_VERSION:-}" ]]; then
    current=$(rustc --version 2>/dev/null | awk '{print $2}') || current=""
    if [[ "$current" != "$KODIZM_ENV_RUST_VERSION" ]]; then
        echo "Switching Rust to ${KODIZM_ENV_RUST_VERSION}..."
        rustup default "$KODIZM_ENV_RUST_VERSION" || echo "  Warning: Rust ${KODIZM_ENV_RUST_VERSION} not available"
    fi
fi

# Switch Go version if requested (mise-managed — set first, check after)
if [[ -n "${KODIZM_ENV_GO_VERSION:-}" ]]; then
    echo "Switching Go to ${KODIZM_ENV_GO_VERSION}..."
    mise use --global "go@${KODIZM_ENV_GO_VERSION}" || echo "  Warning: Go ${KODIZM_ENV_GO_VERSION} not available"
fi

# Switch Ruby version if requested (mise-managed — set first, check after)
if [[ -n "${KODIZM_ENV_RUBY_VERSION:-}" ]]; then
    echo "Switching Ruby to ${KODIZM_ENV_RUBY_VERSION}..."
    mise use --global "ruby@${KODIZM_ENV_RUBY_VERSION}" || echo "  Warning: Ruby ${KODIZM_ENV_RUBY_VERSION} not available"
fi

# Switch Java version if requested (mise-managed — set first, check after)
if [[ -n "${KODIZM_ENV_JAVA_VERSION:-}" ]]; then
    echo "Switching Java to ${KODIZM_ENV_JAVA_VERSION}..."
    mise use --global "java@${KODIZM_ENV_JAVA_VERSION}" || echo "  Warning: Java ${KODIZM_ENV_JAVA_VERSION} not available"
fi
