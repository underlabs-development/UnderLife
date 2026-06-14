#!/usr/bin/env bash
set -euo pipefail

ENV=${1:-staging}

if [[ "$ENV" != "staging" && "$ENV" != "production" && "$ENV" != "arena" ]]; then
  echo "Usage: $0 [staging|production|arena]"
  exit 1
fi

SHORT_SHA=$(git rev-parse --short HEAD)

echo "Deploying to $ENV (tag: $SHORT_SHA)..."

gcloud builds submit \
  --config="cloudbuild-${ENV}.yaml" \
  --project=lexroom \
  --substitutions="_TAG=${SHORT_SHA},_REVISION_SUFFIX=commit-${SHORT_SHA}" \
  .
