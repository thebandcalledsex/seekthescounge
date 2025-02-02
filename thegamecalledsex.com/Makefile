# Variables
BUNDLER = npx webpack
TS_COMPILER = tsc
FORMATTER = npx prettier --write
SRC_DIR = src
DIST_DIR = dist
TS_CONFIG = tsconfig.json

# Default target: Compile TypeScript and bundle with Webpack
all:
	$(BUNDLER)

# Format the entire src directory with Prettier (only when explicitly run)
good:
	$(FORMATTER) "$(SRC_DIR)"

# Clean compiled files
clean:
	rm -rf $(DIST_DIR)/*

# Watch for changes and recompile automatically
watch:
	npx webpack --watch

.PHONY: all clean watch good
