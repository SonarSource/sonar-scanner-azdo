#!/bin/bash

GIT_ROOT=$(git rev-parse --show-toplevel)

cd $GIT_ROOT && npm install

cd $GIT_ROOT/common/ts && npm install
cd $GIT_ROOT/commonv5/ts && npm install

cd $GIT_ROOT/extensions/sonarqube/tasks/analyze/v4 && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/prepare/v4 && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/publish/v4 && npm install

cd $GIT_ROOT/extensions/sonarqube/tasks/analyze/v5 && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/prepare/v5 && npm install
cd $GIT_ROOT/extensions/sonarqube/tasks/publish/v5 && npm install

cd $GIT_ROOT/extensions/sonarcloud/tasks/prepare/v1 && npm install
cd $GIT_ROOT/extensions/sonarcloud/tasks/analyze/v1 && npm install
cd $GIT_ROOT/extensions/sonarcloud/tasks/publish/v1 && npm install

cd $GIT_ROOT
