Phaser.js Development Environment Setup
--

# Software Prerequisites

## VS Code

- Download and install [VS Code](https://code.visualstudio.com/).

## Homebrew

> See: https://brew.sh/

Install Homebrew:

```shell
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Add it to the shell environment:

```shell
echo >> ~/.zprofile
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Node.js

Install Node.js using Homebrew:

```shell
brew install node
```

Verify the installation:

```shell
node -v
npm -v
npx -v
```

## TypeScript

Install TypeScript globally:

```shell
npm install -g typescript
```

Verify the installation:

```shell
tsc -v
```

## Phaser.js

Install Phaser.js using npm:

```shell
npm install phaser 
```

# Extras

## Adding a public key to the website

Found via the Dreamhost control panel:

FTP_SERVER=vpsXXXXX.dreamhostps.com
FTP_USER=dh_XXXXXX
SSH_KEY_NAME={ssh key filename}

```shell
ssh-copy-id -i ~/.ssh/$(SSH_KEY_NAME).pub $(FTP_USER)@$(FTP_SERVER)
ssh-copy-id -i ~/.ssh/tbcs.pub dh_hubz47@vps40077.dreamhostps.com
```

This is necessary to redo if the server starts asking for a password again when deploying via `make deploy`.