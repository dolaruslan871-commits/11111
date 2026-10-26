#!/usr/bin/env bash
set -euo pipefail
cd /workspace/11111/paw
export npm_config_cache=/workspace/.npm-cache
export electron_config_cache=/workspace/.cache/electron
export ELECTRON_GET_USE_PROXY=1
npm ci --no-audit --no-fund
node node_modules/electron/install.js
npm test
