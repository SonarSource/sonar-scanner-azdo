#!/usr/bin/env bash

source cirrus-env PROMOTE

npm run promote && npm run burgr
