#!/bin/bash

GIT_ROOT=$(git rev-parse --show-toplevel)

cd $GIT_ROOT && npm install

cd $GIT_ROOT/src/common/latest/ && npm install
cd $GIT_ROOT/src/common/sonarqube-v4/ && npm install

