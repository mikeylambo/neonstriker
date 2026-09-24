#!/bin/sh
# Rebuild dist/game.bundle.js from src/main.js.
#
# IMPORTANT: index.html loads dist/game.bundle.js as a plain classic <script>,
# NOT the ES module source directly. This is intentional — a real <script
# type="module"> is blocked by CORS when the game is opened via file://
# (i.e. just double-clicking index.html), which silently breaks every button
# on the page (onclick handlers throw "X is not defined" with no visible
# error to the player). Bundling into one classic script removes that failure
# mode entirely: the game now works from a plain double-click, no local server
# required, in addition to still working when properly served over http(s).
#
# Run this after ANY change to a file under src/ and before sharing a build.
# If you add a new npm dependency for esbuild itself, `npm install esbuild`
# first — this script assumes it's already installed.

set -e
cd "$(dirname "$0")"
ESBUILD_BIN="$(find node_modules/@esbuild -name esbuild -type f 2>/dev/null | head -1)"
if [ -z "$ESBUILD_BIN" ]; then
  ESBUILD_BIN="node_modules/.bin/esbuild"
fi
"$ESBUILD_BIN" src/main.js --bundle --format=iife --outfile=dist/game.bundle.js --target=es2019
echo "Rebuilt dist/game.bundle.js from src/main.js"
