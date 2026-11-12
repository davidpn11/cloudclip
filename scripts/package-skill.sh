#!/bin/sh
# Builds dist/cloudclip-review.zip for skill marketplaces such as Agensi: one top-level folder with SKILL.md inside.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist && rm -f dist/cloudclip-review.zip
cd skills && zip -rq ../dist/cloudclip-review.zip cloudclip-review -x '*.DS_Store' '*/__pycache__/*'
echo "dist/cloudclip-review.zip"
