#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get current version number from version.json
current_version=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[0-9.]*"' "$SCRIPT_DIR/../version.json" | awk -F'"' '{print $4}')

# Calculate new version
new_version=$(echo "$current_version + 0.01" | bc | awk '{printf "%.2f", $0}')

# Replace version in version.json
sed -i '' "s|\"version\": \"$current_version\"|\"version\": \"$new_version\"|" "$SCRIPT_DIR/../version.json"
