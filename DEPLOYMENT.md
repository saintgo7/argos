# Argos Self-Host Deployment

> **Target**: `argos.abada.co.kr` — runs on abada-int-65 (172.16.129.65), port 10280, behind Cloudflare Tunnel.
> **Pattern**: abada Tier A (GHCR + SSH + Cloudflare Tunnel). Same recipe as abada-shop.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Cloudflare      │     │  abada-int-65    │     │  GHCR            │
│  Tunnel          │────▶│  Docker Compose  │◀────│  argos-web:latest│
│  argos.abada.    │     │  web : 10280     │     │                  │
│  co.kr           │     │  postgres (int.) │     └──────────────────┘
└──────────────────┘     └──────────────────┘
```

- `web` — Next.js 15 app, binds host port 10280, connects to internal `postgres` service
- `postgres` — PostgreSQL 16, internal-only (no host port), named volume `postgres_data`
- Prisma migrations run via `docker compose exec web npx prisma migrate deploy` (idempotent)
- Cloudflare Tunnel ingress: `argos.abada.co.kr` → `http://localhost:10280`

---

## Initial Server Setup (one time)

### 1. Prerequisites on abada-int-65

- Docker + Docker Compose v2 installed
- `cloudflared` tunnel `05-dev-ext` running (shared with other abada services)
- Deploy user has `docker` group access
- `/data` partition exists

### 2. Clone the repo

```bash
sudo mkdir -p /data/argos
sudo chown "$USER:$USER" /data/argos
cd /data && git clone https://github.com/saintgo7/argos.git
cd /data/argos
# Pull deploy files from the deploy/abada-selfhost branch
git fetch origin
git checkout main  # main is synced with saintgo7/argos default (post-merge)
```

### 3. Create `.env.production`

```bash
cp .env.production.example .env.production

# Generate strong secrets
openssl rand -hex 32        # use for AUTH_SECRET
openssl rand -hex 32        # use for JWT_SECRET
openssl rand -hex 32        # use for POSTGRES_PASSWORD

# Edit .env.production and paste the values
chmod 600 .env.production   # restrict to owner
```

**Important**: the same password must appear in `POSTGRES_PASSWORD`, `DATABASE_URL`, and `DIRECT_URL`.

### 4. Bring up PostgreSQL first

```bash
COMPOSE="docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE up -d postgres
$COMPOSE ps postgres          # wait for "healthy"
```

### 5. Bring up web + run migrations

```bash
# First pull the image from GHCR (after CI has pushed it at least once)
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
$COMPOSE pull web

$COMPOSE up -d web
# Wait ~30s for Next.js to boot, then:
$COMPOSE exec -T web npx prisma migrate deploy --schema packages/web/prisma/schema.prisma
$COMPOSE ps
curl -fsS http://127.0.0.1:10280/api/health    # expect {"status":"ok"}
```

### 6. Cloudflare Tunnel ingress

Cloudflare Dashboard → Zero Trust → Networks → Tunnels → `05-dev-ext` → Public Hostnames → Add:

- Subdomain: `argos`
- Domain: `abada.co.kr`
- Path: (leave blank)
- Service Type: `HTTP`
- URL: `localhost:10280`

Then verify:

```bash
dig argos.abada.co.kr
curl -fsS https://argos.abada.co.kr/api/health
```

### 7. GitHub secrets (saintgo7/argos repo → Settings → Secrets → Actions)

Same set as `saas-abada-shop` (values reusable — same server):

| Secret | Value |
|---|---|
| `ABADA_SSH_HOST` | abada-int-65 IP |
| `ABADA_SSH_PORT` | 5022 |
| `ABADA_SSH_USER` | deploy user |
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
3. SSH to `/data/argos` → `git fetch` → `compose pull web` → `compose up -d` → `prisma migrate deploy`
4. Health check (12 × 10s) against `http://127.0.0.1:10280/api/health`
5. On failure: re-tag `backup` → `latest` and recompose (automatic rollback)

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
cd /data/argos
docker compose logs -f web
docker compose logs -f postgres
ls -lh logs/           # deploy.log archive (last 30 runs)
```

### Manual migration

```bash
cd /data/argos
COMPOSE="docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE exec -T web npx prisma migrate deploy --schema packages/web/prisma/schema.prisma
```

### Manual rollback

```bash
cd /data/argos
docker tag ghcr.io/saintgo7/argos-web:backup ghcr.io/saintgo7/argos-web:latest
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

Or rollback to a specific SHA:

```bash
docker pull ghcr.io/saintgo7/argos-web:<sha>
docker tag  ghcr.io/saintgo7/argos-web:<sha> ghcr.io/saintgo7/argos-web:latest
docker compose ... up -d
```

### Postgres backup

```bash
cd /data/argos
mkdir -p backups
docker compose exec -T postgres \
  pg_dump -U argos argos | gzip > "backups/argos-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restore:

```bash
gunzip -c backups/argos-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U argos -d argos
```

### Data volume name

`argos_postgres_data` (docker-compose auto-prefixed with project dir name). To confirm:

```bash
docker volume ls | grep argos
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 at argos.abada.co.kr | `docker compose ps web` healthy? Tunnel running? |
| Migration P3009 (failed migration) | `$COMPOSE exec -T web npx prisma migrate resolve --rolled-back <name> --schema packages/web/prisma/schema.prisma` then retry |
| `AUTH_SECRET` too short error | regenerate with `openssl rand -hex 32` (64 hex chars = 32 bytes) |
| CLI redirects to `argos-ai.xyz` | check `.argos/project.json` `apiUrl`; run `argos --api-url https://argos.abada.co.kr` once |
| `docker login ghcr.io` fails on server | GITHUB_TOKEN expired — regenerate a PAT with `read:packages` and re-run |
