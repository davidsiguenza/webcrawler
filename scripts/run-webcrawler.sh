#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required to run WebCrawler." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to install WebCrawler dependencies." >&2
  exit 1
fi

if [ ! -d "${ROOT_DIR}/node_modules/cheerio" ]; then
  echo "Installing WebCrawler dependencies..." >&2
  (
    cd "${ROOT_DIR}"
    npm install
  )
fi

exec node "${ROOT_DIR}/bin/webcrawler.js" "$@"
