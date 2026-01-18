# Load in .env variables
include .env
export $(shell sed 's/=.*//' .env)

# Variables
BUNDLER = npx webpack
TS_COMPILER = npx tsc
FORMATTER = npx prettier --write
SRC_DIR = src
ASSETS_DIR = assets
DIST_DIR = dist
TS_CONFIG = tsconfig.json

# Default target: Build for production
all: clean build

# Compile only
build:
	$(TS_COMPILER) --project $(TS_CONFIG)

# Build a dev distribution for local compiled testing
dist: $(SRC_DIR)/**/* index-dev-js.html
	cp index-dev-js.html index.html
	$(TS_COMPILER) --project $(TS_CONFIG) && $(BUNDLER) --mode production

# Format the src directory with Prettier
good:
	$(FORMATTER) "$(SRC_DIR)"

# Clean compiled files
clean:
	rm -rf $(DIST_DIR)/*
	rm -f index.html

# Serve ts files directly with Webpack Dev Server (Live Reload)
server:
	cp index-dev-ts.html index.html
	$(TS_COMPILER) --project $(TS_CONFIG) && npx vite

# Deploy to the website
deploy: $(SRC_DIR)/**/* index-prod.html

	sh utilities/increment_version.sh

	cp index-prod.html index.html
	$(TS_COMPILER) --project $(TS_CONFIG) && $(BUNDLER) --mode production

	# Bust browser caches with the new version by appending a unique timestamp to the bundle.js file ref in index.html
	TIMESTAMP=$$(date +%Y%m%d-%H%M%S); \
	sed -i '' -E \
		-e 's|(src="src/[^"?]+\.js)\?v=[^"]*(")|\1?v='"$$TIMESTAMP"'\2|g' \
		-e 's|(src="src/[^"?]+\.js)(")|\1?v='"$$TIMESTAMP"'\2|g' \
	index.html

	@echo FTP_SERVER: $(FTP_SERVER)
	@echo FTP_USER: $(FTP_USER)

	# Upload files using rsync for incremental changes
	rsync -avz -e "ssh -i $(FTP_PRIVATE_KEY)" \
		index.html \
		manifest.webmanifest \
		service-worker.js \
		version.json \
		$(FTP_USER)@$(FTP_SERVER):$(FTP_REMOTE_DIR)/

	rsync -avz -e "ssh -i $(FTP_PRIVATE_KEY)" \
		$(DIST_DIR)/ \
		$(FTP_USER)@$(FTP_SERVER):$(FTP_REMOTE_DIR)/src/

	rsync -avz -e "ssh -i $(FTP_PRIVATE_KEY)" \
		$(ASSETS_DIR)/ \
		$(FTP_USER)@$(FTP_SERVER):$(FTP_REMOTE_DIR)/assets/

reset-version:
	sh utilities/reset_version.sh

.PHONY: all build dist good clean server deploy
