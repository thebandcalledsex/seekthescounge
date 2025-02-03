#!/bin/bash

# Get current version number from src/constants.ts
current_version=$(grep 'GAME_VERSION' src/constants.ts | awk -F'"' '{print $2}')

# Calculate new version
new_version=$(echo "$current_version + 0.01" | bc | awk '{printf "%.2f", $0}')

# Replace version in src/constants.ts
sed -i "s/GAME_VERSION = \"$current_version\"/GAME_VERSION = \"$new_version\"/" src/constants.ts


