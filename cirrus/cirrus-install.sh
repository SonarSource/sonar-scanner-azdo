#!/usr/bin/env bash

# Install helper. Pass "full" as an argument to install dependencies of modules.

npm install

if [[ "$1" == "full" ]]; then
  npm run install-dep
  npm run install-depv4
  npm run install-depv5
  npm run clean
fi
