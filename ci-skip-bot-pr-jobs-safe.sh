#!/usr/bin/env bash
# Safe updater: dry-run, show diffs, then apply, commit, push, open PR.
# Usage: ./ci-skip-bot-pr-jobs-safe.sh
set -euo pipefail
trap 'rc=$?; echo "ERROR: failed at line $LINENO (exit $rc). See log: $LOGFILE"; exit $rc' ERR

LOGFILE="/tmp/ci-skip-bot-pr-jobs-$(date +%Y%m%dT%H%M%S).log"
exec > >(tee -a "$LOGFILE") 2>&1

echo "START: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Logfile: $LOGFILE"
echo

# Prereqs
for tool in git gh yq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required tool: $tool"
    echo "Install it and re-run. (yq must be mikefarah yq v4+)"
    exit 2
  fi
done

echo "Versions:"
git --version
gh --version || true
yq --version || true
echo

# Ensure repo root (has .git)
if [ ! -d .git ]; then
  echo "This directory doesn't look like a git repo root (no .git)."
  exit 2
fi

branch="ci/skip-bot-pr-jobs"
echo "Creating branch: $branch"
git fetch origin || true
# If branch exists locally, make a timestamped branch instead
if git show-ref --verify --quiet "refs/heads/$branch"; then
  branch="${branch}-$(date +%s)"
  echo "Branch existed; using $branch instead"
fi
git checkout -b "$branch"

changed_any=false

# The guard expression to inject
guard='!(github.event_name == '\''pull_request'\'' && (github.actor == '\''app/copilot-swe-agent'\'' || github.actor == '\''Copilot'\'' || github.actor == '\''dependabot[bot]'\'') )'

# Process workflow files
shopt -s nullglob
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] || continue
  echo
  echo "Processing: $f"
  tmp="${f}.tmp"
  # Produce the transformed YAML to tmp (do not overwrite yet)
  # We set .jobs.<job>.if if it's missing; if it's present we keep existing (so we don't replace user's custom if)
  yq eval --null-input --exit-status -o=json 'true' >/dev/null 2>&1 || true
  # Build jq-like edit: for each job, if .if exists leave it, else set it.
  yq eval ".jobs |= with_entries( .value |= ( .if //= \"$guard\" ))" "$f" > "$tmp"
  if ! diff -u "$f" "$tmp" >/dev/null 2>&1; then
    echo "Diff for $f:"
    diff -u "$f" "$tmp" || true
    echo "Will apply changes to $f"
    mv "$tmp" "$f"
    git add "$f"
    changed_any=true
  else
    echo "No change needed for $f"
    rm -f "$tmp"
  fi
done
shopt -u nullglob

if [ "$changed_any" = false ]; then
  echo
  echo "No workflow changes required. Nothing to commit."
  echo "Exiting."
  exit 0
fi

echo
echo "Committing changes..."
git commit -m "ci: skip jobs for Copilot/Dependabot PRs to reduce noise"
echo "Pushing branch $branch..."
git push --set-upstream origin "$branch"

echo "Opening PR..."
gh pr create \
  --title "ci: skip jobs for bot PRs" \
  --body "Skip job execution on PRs authored by Copilot and Dependabot to reduce noise. Jobs will be skipped (not deleted) so humans still receive checks." \
  --base main

echo
echo "Done. PR opened for branch: $branch"
echo "Logfile: $LOGFILE"
echo "END: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"