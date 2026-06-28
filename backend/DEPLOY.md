# Deploying the UnderFinance backend on Ubuntu

Native deploy: **uv + Gunicorn + systemd**, Postgres locally, and your existing
**Cloudflare Tunnel** for TLS/exposure. Target: Ubuntu 24.04 LTS. Run as a
dedicated `underfinance` user; code lives in `/opt/UnderLife`.

> The `docker/` folder in this repo is from a different project — ignore it.

---

## 1. System packages

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install postgresql postgresql-contrib git curl ca-certificates
```

## 2. App user + code

```bash
sudo adduser --system --group --home /opt/UnderLife underfinance
sudo mkdir -p /opt/UnderLife && sudo chown underfinance:underfinance /opt/UnderLife
sudo -u underfinance git clone <YOUR_REPO_URL> /opt/UnderLife   # or scp the repo here
```

## 3. Install uv + dependencies (as the app user)

```bash
sudo -u underfinance bash -lc '
  curl -LsSf https://astral.sh/uv/install.sh | sh
  cd /opt/UnderLife/backend
  ~/.local/bin/uv sync            # installs Python 3.14 + all deps into .venv
'
```

## 4. Postgres database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER underfinance WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE underfinance OWNER underfinance;
SQL
```

## 5. Environment file

```bash
sudo -u underfinance cp /opt/UnderLife/backend/deploy/env.production.example \
                        /opt/UnderLife/backend/.env
sudo -u underfinance nano /opt/UnderLife/backend/.env
```
Fill in: `DJANGO_SECRET_KEY` (long random), DB password, `BANKSYNC_ENCRYPTION_KEY`
(keep the SAME value you used locally or existing bank tokens won't decrypt),
the Enable Banking app id, and the hostnames. Then copy your private key:

```bash
sudo -u underfinance mkdir -p /opt/UnderLife/backend/secrets
# scp your Enable Banking .pem into that folder, then:
sudo chmod 600 /opt/UnderLife/backend/secrets/*.pem
```

## 6. Migrate, static, admin

```bash
cd /opt/UnderLife/backend
sudo -u underfinance /opt/UnderLife/.local/bin/uv run python manage.py migrate
sudo -u underfinance /opt/UnderLife/.local/bin/uv run python manage.py collectstatic --noinput
sudo -u underfinance /opt/UnderLife/.local/bin/uv run python manage.py createsuperuser
```

## 7. Gunicorn as a systemd service

```bash
sudo cp /opt/UnderLife/backend/deploy/underfinance-api.service \
        /etc/systemd/system/underfinance-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now underfinance-api
sudo systemctl status underfinance-api          # should be active (running)
curl -s http://127.0.0.1:8000/api/openapi.json | head -c 80   # sanity check
```
Logs: `journalctl -u underfinance-api -f`

## 8. Expose via Cloudflare Tunnel

Run `cloudflared` on this box so `api-local-os.underlabs.it` → `localhost:8000`.

```bash
# install cloudflared (see Cloudflare docs for the latest .deb), then:
cloudflared tunnel login
cloudflared tunnel create underfinance
```
`/etc/cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: api-local-os.underlabs.it
    service: http://localhost:8000
  - service: http_status:404
```
```bash
cloudflared tunnel route dns underfinance api-local-os.underlabs.it
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```
Cloudflare provides the TLS cert for the single-label host; the redirect URL
registered in Enable Banking must match `ENABLEBANKING_REDIRECT_URL`.

> Alternative (no Cloudflare): nginx reverse-proxy to `127.0.0.1:8000` +
> `certbot` for Let's Encrypt. Then set `SECURE_SSL_REDIRECT=True` via nginx.

## 9. Local AI (optional — categorization/advisor)

```bash
curl -fsSL https://ollama.com/install.sh | sh    # installs + starts ollama.service
ollama pull qwen2.5:3b-instruct-q4_K_M
```
Leave `OLLAMA_HOST=http://127.0.0.1:11434` in `.env`. Without it, categorization
falls back to rules/cache and the advisor shows plain text (no errors). Needs
~4 GB free RAM for the 3B model.

## 10. Verify end-to-end

- `https://api-local-os.underlabs.it/api/openapi.json` returns JSON
- `https://api-local-os.underlabs.it/admin/` loads (styled — confirms static)
- Log in to the frontend and hit **Sync now** / the AI actions

---

## Redeploy (after code changes)

```bash
cd /opt/UnderLife/backend
sudo -u underfinance git -C /opt/UnderLife pull
sudo -u underfinance ~/.local/bin/uv sync
sudo -u underfinance ~/.local/bin/uv run python manage.py migrate
sudo -u underfinance ~/.local/bin/uv run python manage.py collectstatic --noinput
sudo systemctl restart underfinance-api
```

---

## Continuous deployment (auto-deploy on push to `main`)

Because the box is behind a Cloudflare Tunnel (no inbound SSH), we use a
**self-hosted GitHub Actions runner**. It connects out to GitHub, so every push
to `main` that touches `backend/**` runs `deploy/deploy.sh` locally:
`git reset --hard origin/main` → `uv sync` → `migrate` → `collectstatic` →
`systemctl restart underfinance-api`. The workflow is
`.github/workflows/deploy-backend.yml`.

### One-time setup on the server

1. **Ownership + sudo rules.** The deploy always runs as `underfinance` (the repo
   owner); the runner elevates to it with `sudo -u underfinance`. Set
   `RUNNER_USER` to the user the runner runs as (the user you configured it with —
   check with `ps -o user= -C Runner.Listener | head -1`):
   ```bash
   # the repo must be owned by underfinance
   sudo chown -R underfinance:underfinance /opt/UnderLife

   RUNNER_USER=<your-runner-user>
   sudo tee /etc/sudoers.d/underfinance-deploy >/dev/null <<EOF
   # runner may run the deploy as underfinance, no password
   $RUNNER_USER ALL=(underfinance) NOPASSWD: /opt/UnderLife/backend/deploy/deploy.sh
   # underfinance may restart the API service, no password
   underfinance ALL=(root) NOPASSWD: /usr/bin/systemctl restart underfinance-api
   EOF
   sudo chmod 440 /etc/sudoers.d/underfinance-deploy
   sudo visudo -c     # validate syntax
   ```

2. **Make sure `/opt/UnderLife` can pull unattended.** Public repo: nothing to
   do. Private repo: add a read-only **deploy key** and use the SSH remote:
   ```bash
   sudo -u underfinance ssh-keygen -t ed25519 -f /opt/UnderLife/.ssh-deploy -N ''
   # add /opt/UnderLife/.ssh-deploy.pub to GitHub repo → Settings → Deploy keys (read-only)
   sudo -u underfinance git -C /opt/UnderLife remote set-url origin git@github.com:<OWNER>/<REPO>.git
   # point git at the key:
   sudo -u underfinance git config --global core.sshCommand \
     "ssh -i /opt/UnderLife/.ssh-deploy -o IdentitiesOnly=yes"
   ```

3. **Install the runner** (as the `underfinance` user). Grab the exact download
   URL + token from GitHub → repo **Settings → Actions → Runners → New
   self-hosted runner (Linux)**, then:
   ```bash
   sudo -u underfinance bash -lc '
     mkdir -p ~/actions-runner && cd ~/actions-runner
     curl -o r.tar.gz -L <RUNNER_DOWNLOAD_URL_FROM_GITHUB>
     tar xzf r.tar.gz
     ./config.sh --url https://github.com/<OWNER>/<REPO> \
                 --token <RUNNER_TOKEN> --labels underfinance --unattended
   '
   cd ~underfinance/actions-runner        # = /opt/UnderLife/actions-runner
   sudo ./svc.sh install underfinance     # runs the runner as the underfinance user
   sudo ./svc.sh start
   ```
   The `--labels underfinance` must match `runs-on: [self-hosted, underfinance]`
   in the workflow.

4. **Verify:** push a small change under `backend/`, or run the workflow from the
   **Actions** tab (it has a manual *Run workflow* button). Watch it in Actions,
   and on the box: `journalctl -u underfinance-api -f`.

> The runner needs the initial `/opt/UnderLife` clone + `.env` + `secrets/` to
> already exist (steps 2–5 above) — CD only updates code and restarts; it never
> touches `.env`, `secrets/`, `.venv`, or the database.

## Notes
- **Sizing**: 3 Gunicorn threaded workers suit a single user. The local model is
  the RAM driver — size the VM for Ollama if you enable it.
- **Backups**: `pg_dump underfinance` on a cron; also back up `.env` and
  `secrets/` (losing `BANKSYNC_ENCRYPTION_KEY` makes stored bank tokens
  unreadable → just reconnect the banks).
- **Frontend** (Next.js) is deployed separately — say the word for that guide.
