#!/bin/bash

# Set the current version to 0.00
sed -i "s/GAME_VERSION = \"[0-9]\+\.[0-9]\+\"/GAME_VERSION = \"0.00\"/" src/constants.ts
sed -i "s/const CACHE_VERSION = \".*\";/const CACHE_VERSION = \"0.00\";/" service-worker.js
