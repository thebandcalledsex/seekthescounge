# Variables
BUNDLER = npx webpack
TS_COMPILER = npx tsc
FORMATTER = npx prettier --write
SRC_DIR = src
DIST_DIR = dist
TS_CONFIG = tsconfig.json

# Default target: Build for production
all: build

# Build for production (compiles TS and bundles with Webpack)
build:
	cp index.prod.html index.html && $(TS_COMPILER) && $(BUNDLER) --mode production 

# Format the entire src directory with Prettier
good:
	$(FORMATTER) "$(SRC_DIR)"

# Clean compiled files
clean:
	rm -rf $(DIST_DIR)/*
	rm -f index.html

# Serve with Webpack Dev Server (Live Reload)
serve:
	cp index.dev.html index.html && npx vite

.PHONY: all clean watch good
