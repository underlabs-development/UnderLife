#!/usr/bin/env bash
# Pull latest main and roll the API. Run by the GitHub Actions self-hosted
# runner (as the `underfinance` user) and safe to run by hand too.
set -euo pipefail

REPO_DIR=/opt/underlife
UV="$HOME/.local/bin/uv"

cd "$REPO_DIR"
git fetch --all --prune
git reset --hard origin/main

cd "$REPO_DIR/backend"
"$UV" sync
"$UV" run python manage.py migrate --noinput
"$UV" run python manage.py collectstatic --noinput
sudo systemctl restart underfinance-api

echo "Deployed $(git rev-parse --short HEAD) at $(date -Is)"
