#!/bin/bash
# Record the booted iOS Simulator. start <mp4> backgrounds simctl recordVideo.
# stop ends that recording. The USB iPhone is not a source.
set -euo pipefail

export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
PID_FILE="${TMPDIR:-/tmp}/kelyra-ui-motion.pid"

cmd="${1:-}"
case "$cmd" in
  start)
    out="${2:-}"
    if [[ -z "$out" ]]; then
      echo "MOTION_PATH_MISSING" >&2
      exit 2
    fi
    mkdir -p "$(dirname "$out")"
    rm -f "$out"
    xcrun simctl io booted recordVideo --codec h264 "$out" >/dev/null 2>&1 &
    echo $! >"$PID_FILE"
    echo "RECORDING"
    ;;
  stop)
    if [[ -f "$PID_FILE" ]]; then
      kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
      rm -f "$PID_FILE"
    fi
    # simctl recordVideo exits when its process group gets SIGINT.
    pkill -INT -f "simctl io booted recordVideo" >/dev/null 2>&1 || true
    echo "STOPPED"
    ;;
  *)
    echo "usage: record-ui-motion.sh start <mp4> | stop" >&2
    exit 2
    ;;
esac
