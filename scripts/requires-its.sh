#!/usr/bin/env bash
# Reads changed file paths on stdin and prints "true" when at least one of them can affect
# the integration tests, "false" otherwise.
# Paths are matched against an exclusion list on purpose: any unknown path triggers the ITs.

set -euo pipefail

ITS_IRRELEVANT_PATHS='^docs/|^\.github/|\.md$|^renovate\.json$|^LICENSE\.txt$|^NOTICE\.txt$'

if grep --invert-match --extended-regexp --quiet "$ITS_IRRELEVANT_PATHS"; then
  echo true
else
  echo false
fi
