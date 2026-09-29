#!/bin/bash
# Boot an iPhone simulator when none is already running.
# Uses the Xcode.app developer directory so this works even when
# xcode-select still points at the Command Line Tools.
set -euo pipefail

export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"

if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Xcode is not installed at $DEVELOPER_DIR" >&2
  exit 2
fi

if ! xcrun simctl help >/dev/null 2>&1; then
  echo "simctl is not usable. From a Terminal, run:" >&2
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  echo "  sudo xcodebuild -license accept" >&2
  exit 2
fi

open_device_window() {
  local udid="$1"
  # Xcode 27 shows the simulated phone in DeviceHub, not Simulator.app.
  open "devices://device/open?id=${udid}" >/dev/null 2>&1 ||
    open "/Applications/Xcode.app/Contents/Applications/DeviceHub.app" >/dev/null 2>&1 ||
    true
}

booted="$(xcrun simctl list devices booted | awk -F '[()]' '/iPhone/ && /Booted/ { print $2; exit }')"
if [[ -n "${booted}" ]]; then
  name="$(xcrun simctl list devices booted | awk -F '(' '/iPhone/ && /Booted/ { print $1; exit }' | sed 's/^ *//;s/ *$//')"
  open_device_window "${booted}"
  echo "ALREADY_BOOTED ${name} ${booted}"
  exit 0
fi

udid="$(
  xcrun simctl list devices available |
    awk -F '[()]' '/iPhone/ && $0 !~ /unavailable/ { id=$2 } END { print id }'
)"
if [[ -z "${udid}" ]]; then
  echo "No available iPhone simulator runtime." >&2
  exit 2
fi

name="$(
  xcrun simctl list devices available |
    awk -F '(' -v id="${udid}" 'index($0, id) { print $1; exit }' |
    sed 's/^ *//;s/ *$//'
)"

xcrun simctl boot "${udid}" >/dev/null 2>&1 || true
open_device_window "${udid}"

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18; do
  if xcrun simctl list devices booted | grep -q "${udid}"; then
    echo "BOOTED ${name} ${udid}"
    exit 0
  fi
  sleep 5
done

echo "Simulator ${name} (${udid}) did not finish booting." >&2
exit 2
