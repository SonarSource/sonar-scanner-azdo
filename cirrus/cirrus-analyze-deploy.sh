#!/usr/bin/env bash

source cirrus-env BUILD

npm run validate-ci && npm run sonarqube && npm run deploy
