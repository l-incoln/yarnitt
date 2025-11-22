#!/usr/bin/env bash
set -euo pipefail

repo="l-incoln/yarnitt"
workflow="CI - integration (docker-compose)"
branch="ci/add-integration-workflow"

id=$(gh run list --repo "$repo" --workflow "$workflow" --branch "$branch" --limit 1 --json id | jq -r '.[0].id // empty')
if [ -z "$id" ]; then
  echo "No run id found"
  exit 1
fi

echo "Rerunning run $id..."
gh run rerun "$id" --repo "$repo"
gh run watch "$id" --repo "$repo"