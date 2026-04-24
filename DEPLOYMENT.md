# Argos Self-Host Deployment

> **Target**: `argos.abada.co.kr` — runs on abada-65, port 10350, behind Cloudflare Tunnel.
> **Pattern**: abada-65 convention — nginx entrypoint, bind-mounted data, single `docker-compose.prod.yml`.

## Architecture

```
 Cloudflare Tunnel (05-dev-ext)
         │
         ▼
 127.0.0.1:10350  ←  bound by argos-nginx on abada-65
         │
         ▼    argos-net (bridge)
 ┌──────────────┐     ┌──────────────┐
 │  argos-web   │────▶│ argos-       │
 │  Next.js 15  │     │ postgres     │
 │  port 3000   │     │ (bind-mount) │
 └──────────────┘     └──────────────┘
```

- `nginx` — Cloudflare Tunnel entrypoint, bound to `127.0.0.1:10350` only
- `web` — Next.js 15 app (includes API routes), internal port 3000
- `postgres` — PostgreSQL 16, bind-mounted at `./data/pgdata`
- No named docker volumes — data lives on the `/data` LVM for easy `tar`/`rsync` backup

## Server layout (abada-65)

```
/data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr/
├── .env                          # secrets (chmod 600, not tracked)
├── docker-compose.prod.yml       # synced from repo by deploy workflow
├── nginx/
│   └── nginx.conf                # synced from repo by deploy workflow
├── data/
│   └── pgdata/                   # PostgreSQL data (bind-mount)
├── logs/                         # deploy logs (rotated, keep 30)
└── src/                          # git clone of saintgo7/argos (read-only source)
```

---

## Initial Server Setup (one time)

### 1. Prerequisites on abada-65

- Docker 28+ with `docker-buildx` plugin and the legacy `docker-compose` binary (v5.x) installed
- `cloudflared` tunnel `05-dev-ext` running (shared with other abada services)
- User `blackpc` with `docker` group access
- `/data` LVM mounted

### 2. Create the directory tree

```bash
# SSH to abada-65 then:
mkdir -p /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
mkdir -p data/pgdata nginx logs src
```

### 3. Clone the repo into src/

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
git clone https://github.com/saintgo7/argos.git src
# Pre-merge: stay on the deploy branch so compose files exist
git -C src checkout deploy/abada-selfhost
```

After the PR is merged to main, the deploy workflow will auto `git -C src checkout -f origin/main`.

### 4. Copy compose + nginx from src/ to the service root

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
cp src/docker-compose.prod.yml .
cp src/nginx/nginx.conf nginx/
```

### 5. Create `.env` (chmod 600)

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
cp src/.env.example .env

# Generate strong secrets
POSTGRES_PW=$(openssl rand -hex 32)
AUTH=$(openssl rand -hex 32)
JWT=$(openssl rand -hex 32)

# Substitute (verify the file after)
sed -i "s|CHANGE_ME_GENERATE_WITH_openssl_rand_-hex_32|$POSTGRES_PW|" .env
sed -i "s|CHANGE_ME_SAME_AS_POSTGRES_PASSWORD|$POSTGRES_PW|g" .env
sed -i "s|CHANGE_ME_32_CHAR_RANDOM_STRING_HERE_____________________|$AUTH|" .env
sed -i "s|CHANGE_ME_32_CHAR_RANDOM_STRING_HERE______________________|$JWT|" .env

chmod 600 .env
```

### 6. First boot (postgres + web)

```bash
COMPOSE="docker-compose --env-file .env -f docker-compose.prod.yml"

# Bring up postgres first (other services depend on it being healthy)
$COMPOSE up -d postgres
$COMPOSE ps postgres       # wait for "healthy"

# Log in to GHCR (needed to pull the web image)
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
$COMPOSE pull web

# Bring up nginx + web
$COMPOSE up -d

# Wait ~40s, then run Prisma migrations against the empty DB
$COMPOSE exec -T web npx prisma migrate deploy --schema packages/web/prisma/schema.prisma

$COMPOSE ps                                 # all services healthy
curl -fsS http://127.0.0.1:10350/health     # "ok" (from nginx)
curl -fsS http://127.0.0.1:10350/api/health # {"status":"ok"} (from Next.js via nginx)
```

### 7. Cloudflare Tunnel ingress

Cloudflare Dashboard → Zero Trust → Networks → Tunnels → `05-dev-ext` → Public Hostnames → Add:

- Subdomain: `argos`
- Domain: `abada.co.kr`
- Path: (leave blank)
- Service Type: `HTTP`
- URL: `localhost:10350`

Verify:

```bash
dig argos.abada.co.kr
curl -fsS https://argos.abada.co.kr/api/health
```

### 8. GitHub repo secrets (saintgo7/argos → Settings → Secrets → Actions)

Reusable from `saintgo7/saas-abada-shop` (same server):

| Secret | Notes |
|---|---|
| `ABADA_SSH_HOST` | abada-65 IP via bastion |
| `ABADA_SSH_PORT` | 5022 (default) |
| `ABADA_SSH_USER` | `blackpc` |
| `ABADA_SSH_KEY` | private key |
| `BASTION_SSH_HOST` | bastion IP |
| `BASTION_SSH_PORT` | 5022 |
| `BASTION_SSH_USER` | bastion user |
| `BASTION_SSH_KEY` | private key |

Optional repo variable:
- `NEXT_PUBLIC_SITE_URL` = `https://argos.abada.co.kr` (build-arg)

---

## Routine Deploys (automated)

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Lint (`pnpm -F @argos/web lint`) + test (`pnpm -F argos-ai test`)
2. Build Docker image → push to `ghcr.io/saintgo7/argos-web:latest` + `:<sha>`
3. SSH to abada-65 → `/data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr` →
   - `git -C src fetch/checkout origin/main`
   - Copy `docker-compose.prod.yml` + `nginx/nginx.conf` from src
   - Rewrite `TAG=<sha>` in `.env` (atomic tag pin)
   - `docker-compose pull web` + `up -d`
   - `prisma migrate deploy`
4. Health check (12 × 10s) against `http://127.0.0.1:10350/health`
5. On failure: retag `:backup` → `:latest`, reset `TAG=latest`, recompose

---

## CLI: point at the self-host

On each team member's machine:

```bash
npm install -g argos-ai
cd <your-project>

# Option A: override per-call
argos --api-url https://argos.abada.co.kr

# Option B: edit .argos/project.json after the init flow completes
# Set "apiUrl": "https://argos.abada.co.kr"
```

Then commit `.argos/project.json` + `.claude/settings.json` so teammates auto-join.

---

## Operations

### Logs

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f nginx
ls -lh logs/           # deploy.log archive (last 30 runs)
```

### Manual migration

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
COMPOSE="docker-compose --env-file .env -f docker-compose.prod.yml"
$COMPOSE exec -T web npx prisma migrate deploy --schema packages/web/prisma/schema.prisma
```

### Manual rollback

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
docker tag ghcr.io/saintgo7/argos-web:backup ghcr.io/saintgo7/argos-web:latest
sed -i 's|^TAG=.*|TAG=latest|' .env
docker-compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
```

Or pin to a specific SHA:

```bash
docker pull ghcr.io/saintgo7/argos-web:<sha>
sed -i "s|^TAG=.*|TAG=<sha>|" .env
docker-compose --env-file .env -f docker-compose.prod.yml up -d
```

### Postgres backup

```bash
cd /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr
mkdir -p backups
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U argos argos | gzip > "backups/argos-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restore:

```bash
gunzip -c backups/argos-YYYYMMDD-HHMMSS.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres psql -U argos -d argos
```

### Data volume

Bind-mounted — inspect directly:

```bash
sudo du -sh /data/abada-co-kr/argos-abada-co-kr/argos.abada.co.kr/data/pgdata
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 at argos.abada.co.kr | `docker-compose -f docker-compose.prod.yml ps` — all healthy? Tunnel running? |
| nginx up but /api/health 502 | web container healthy? `docker-compose logs web` |
| Migration P3009 (failed migration) | `$COMPOSE exec -T web npx prisma migrate resolve --rolled-back <name> --schema packages/web/prisma/schema.prisma` then retry |
| `AUTH_SECRET` too short error | regenerate with `openssl rand -hex 32` (64 hex chars = 32 bytes) |
| CLI redirects to `argos-ai.xyz` | check `.argos/project.json` `apiUrl`; run `argos --api-url https://argos.abada.co.kr` once |
| `docker login ghcr.io` fails on server | GHCR token expired — generate a PAT with `read:packages` and re-run |
| Port 10350 conflict | `ss -tlnp \| grep 10350` to see who's using it |
