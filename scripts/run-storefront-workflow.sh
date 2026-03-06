#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $(basename "$0") <url> <brand-id> [extra webcrawler workflow args...]"
  exit 1
fi

URL="$1"
BRAND_ID="$2"
shift 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_DIR="$(pwd)"

node "${ROOT_DIR}/bin/webcrawler.js" workflow \
  "${URL}" \
  --brand-id "${BRAND_ID}" \
  --apply-to "${TARGET_DIR}" \
  --out-dir "${TARGET_DIR}/.firecrawl/${BRAND_ID}" \
  --typecheck \
  --build \
  "$@"
