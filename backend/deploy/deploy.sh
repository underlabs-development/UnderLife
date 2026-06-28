#!/usr/bin/env bash
# Pull latest main and roll the API. Invoked by the GitHub Actions runner via
#   sudo -u underfinance -H .../deploy.sh
# so it always runs as the user that owns /opt/UnderLife. Safe to run by hand too.
set -euo pipefail

# Wrapped in a function so the whole script is parsed before `git reset` can
# rewrite this file mid-run (self-update safety).
main() {
  REPO_DIR=/opt/UnderLife
  UV=/opt/UnderLife/.local/bin/uv
  [ -x "$UV" ] || UV="$(command -v uv)"

  cd "$REPO_DIR"
  git fetch --all --prune
  git reset --hard origin/main

  cd "$REPO_DIR/backend"
  "$UV" sync
  "$UV" run python manage.py migrate --noinput
  "$UV" run python manage.py collectstatic --noinput
  sudo systemctl restart underfinance-api

  echo "Deployed $(git rev-parse --short HEAD) at $(date -Is)"
}

main "$@"
