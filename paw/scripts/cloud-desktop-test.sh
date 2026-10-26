#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .runtime
export DISPLAY="${PAW_TEST_DISPLAY:-:100}"
display_pid=''
cleanup() {
  if [[ -n "$display_pid" ]]; then kill "$display_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
  /usr/lib/xorg/Xorg "$DISPLAY" -config "$PWD/scripts/xorg.conf" -logfile "$PWD/.runtime/cloud-xorg.log" -noreset -nolisten tcp -novtswitch >.runtime/cloud-xorg-output.log 2>&1 &
  display_pid=$!
  ready=false
  for attempt in {1..50}; do
    if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then ready=true; break; fi
    if ! kill -0 "$display_pid" 2>/dev/null; then break; fi
    sleep 0.1
  done
  if [[ "$ready" != true ]]; then cat .runtime/cloud-xorg-output.log; exit 1; fi
fi
node scripts/electron-smoke.cjs
