#!/bin/bash

# Get the root directory of the Git repository
GIT_ROOT=$(git rev-parse --show-toplevel)

COMMON_DIR="$GIT_ROOT/src/common"
ORCHESTRATOR_DIR="$GIT_ROOT/its/tools/orchestrator"

# Change directory to the root of the repository
cd "$GIT_ROOT" || exit

# Install dependencies at the root level
echo "Running npm install in $GIT_ROOT"
npm install

# Iterate through each folder in the common directory
for folder in "$COMMON_DIR"/*; do
    if [ -d "$folder" ]; then
         echo "Running npm install in $folder"
        cd "$folder" && npm install || exit
    fi
done

# Echo and install dependencies in the orchestrator directory
echo "Running npm install in $ORCHESTRATOR_DIR"
cd "$ORCHESTRATOR_DIR" && npm install || exit
