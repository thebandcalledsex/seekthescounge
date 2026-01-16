#!/bin/bash

# Set the current version to 0.00
sed -i "s/\"version\": \"[0-9]\+\.[0-9]\+\"/\"version\": \"0.00\"/" version.json
