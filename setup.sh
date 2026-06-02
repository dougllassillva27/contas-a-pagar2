#!/usr/bin/env bash
# dodo-starter-pack setup script (Linux/macOS/Git Bash)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOOKS_DIR="$ROOT/.githooks"

if [ ! -d "$HOOKS_DIR" ]; then
    echo "ERRO: Diretorio .githooks nao encontrado em $ROOT" >&2
    exit 1
fi

git config core.hooksPath .githooks
echo "Hooks do Git ativados com sucesso (.githooks)"
