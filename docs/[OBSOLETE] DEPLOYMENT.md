# Deployment Guide

This guide covers deploying the Next.js app to a home server (laptop) using Docker.

---

## Current Strategy

| Phase                  | Infrastructure              | Capacity             |
| ---------------------- | --------------------------- | -------------------- |
| **Beta / Low Traffic** | Home server (4-core laptop) | ~50 concurrent users |
| **Growth (Future)**    | Google Cloud Run            | Auto-scaling         |

---

## Home Server Deployment

### Prerequisites

- Ubuntu 24.04 (or similar Linux)
- Docker and Docker Compose installed
- Domain pointing to your public IP
- Ports 80/443 forwarded on router

### Step 1: Prepare Environment

Create a `.env` file with production values:

```bash
MOUNTAIN_ID=geyang
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
# ... (all other variables)
```

> [!IMPORTANT]
> `NEXT_PUBLIC_*` variables are baked in at build time. Rebuild required if changed.

### Step 2: Deploy

```bash
cd /path/to/mtcat_next
docker compose up --build -d
```

### Step 3: Set Up HTTPS (Caddy)

Install Caddy and create `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

Reload: `sudo systemctl reload caddy`

### Step 4: Verify

Visit `https://yourdomain.com` — you should see your app with a valid SSL certificate.

---

## CI/CD with GitHub Actions

See [CICD.md](./CICD.md) for automated deployment using a self-hosted runner.

---

## Future: Cloud Run Migration

When traffic exceeds the laptop's capacity (~50+ concurrent users), migrate to Google Cloud Run:

1. Push Docker image to Google Artifact Registry
2. Deploy to Cloud Run with environment variables
3. Update DNS to point to Cloud Run URL

A separate `deploy-cloud-run.yml` workflow will be created when needed.

---

## Monitoring

```bash
# View container logs
docker logs -f mtcat_next-web-1

# Check resource usage
docker stats

# Restart if needed
docker compose restart
```
