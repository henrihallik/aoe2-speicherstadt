#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT/dist"
RMS_SOURCE="$ROOT/Speicherstadt.rms"
RMS_RELEASE="$DIST_DIR/Speicherstadt-Garrison-2026-v0.3.0.rms"
ZIP_RELEASE="$DIST_DIR/Speicherstadt-Garrison-2026-v0.3.0.zip"
SCREENSHOT_DIR="$ROOT/submission/screenshots"
SCREENSHOTS=(
    "$SCREENSHOT_DIR/01-overview.png"
    "$SCREENSHOT_DIR/02-warehouse-island.png"
    "$SCREENSHOT_DIR/03-canal-crossing.png"
)

node "$ROOT/tools/validate-rms.mjs"

for screenshot in "${SCREENSHOTS[@]}"; do
    if [[ ! -s "$screenshot" ]]; then
        printf 'Missing required in-game screenshot: %s\n' "$screenshot" >&2
        exit 1
    fi
    if [[ "$(file -b --mime-type "$screenshot")" != "image/png" ]]; then
        printf 'Required screenshot is not a PNG: %s\n' "$screenshot" >&2
        exit 1
    fi
done

mkdir -p "$DIST_DIR"
cp "$RMS_SOURCE" "$RMS_RELEASE"

zip -j -X -FS "$ZIP_RELEASE" \
    "$RMS_SOURCE" \
    "$ROOT/submission/discord-submission.txt" \
    "${SCREENSHOTS[@]}"

unzip -t "$ZIP_RELEASE"
printf 'Built %s\n' "$RMS_RELEASE"
printf 'Built %s\n' "$ZIP_RELEASE"
