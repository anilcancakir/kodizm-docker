# kodizm-ai-docker

[![Build and Push Docker Image](https://github.com/anilcancakir/kodizm-ai-docker/actions/workflows/build.yml/badge.svg)](https://github.com/anilcancakir/kodizm-ai-docker/actions/workflows/build.yml)

Pre-built Docker image for Kodizm development environments. Includes all runtime dependencies, language toolchains, Claude Code + opencode CLIs, and the three ACP adapters (`claude-agent-acp`, `codex-acp`, `opencode acp`) the Kodizm control plane spawns over `docker exec -i` for project-bound agent sessions.

```bash
docker pull ghcr.io/anilcancakir/kodizm-ai-docker:latest
```
