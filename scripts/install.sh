#!/bin/bash

GIT_ROOT=$(git rev-parse --show-toplevel)

cd $GIT_ROOT && npm install

cd $GIT_ROOT/src && npm install

cd $GIT_ROOT/extensions/sonarqube/tasks/analyze && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/prepare && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/publish && npm install

cd $GIT_ROOT/extensions/sonarcloud/tasks/prepare && npm install
cd $GIT_ROOT/extensions/sonarcloud/tasks/analyze && npm install
cd $GIT_ROOT/extensions/sonarcloud/tasks/publish && npm install

cd $GIT_ROOT
