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

Insrall Phaser.js using npm:

```shell
npm install phaser  
```

