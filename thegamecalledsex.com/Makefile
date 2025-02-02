# Load in .env variables
include .env
export $(shell sed 's/=.*//' .env)

# Variables
BUNDLER = npx webpack
TS_COMPILER = npx tsc
FORMATTER = npx prettier --write
SRC_DIR = src
DIST_DIR = dist
TS_CONFIG = tsconfig.json

# Default target: Build for production
all: build

# Compile only
build:
	$(TS_COMPILER)

# Build a dev distribution
dist: $(SRC_DIR)/*.ts index-dev-js.html
	cp index-dev-js.html index.html
	$(TS_COMPILER) && $(BUNDLER) --mode production

# Format the src directory with Prettier
good:
	$(FORMATTER) "$(SRC_DIR)"

# Clean compiled files
clean:
	rm -rf $(DIST_DIR)/*
	rm -f index.html

# Serve with Webpack Dev Server (Live Reload)
server:
	cp index-dev.html index.html
	npx vite

# Deploy to the website
deploy:
	cp index-prod.html index.html
	$(TS_COMPILER) && $(BUNDLER) --mode production

	@echo FTP_SERVER: $(FTP_SERVER)
	@echo FTP_USER: $(FTP_USER)

	echo "put index.html $(FTP_REMOTE_DIR)/index.html" | sftp -i $(FTP_PRIVATE_KEY) $(FTP_USER)@$(FTP_SERVER)

	echo "put -r $(DIST_DIR)/* $(FTP_REMOTE_DIR)/src/" | sftp -i $(FTP_PRIVATE_KEY) $(FTP_USER)@$(FTP_SERVER)

.PHONY: all clean watch good
