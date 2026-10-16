# NOVA TYPE — production launch

## 1. Server and domain

Use a Linux VPS with at least 2 CPU cores, 4 GB RAM, 40 GB SSD and Ubuntu 24.04 LTS. Point the domain's `A` record to the VPS public IP. Open only ports 22, 80 and 443; restrict SSH to keys and disable password login.

Install Docker Engine and the Docker Compose plugin. Copy the project to `/opt/nova-type` and create `.env.production` from `.env.production.example`. Generate independent secrets:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

Never reuse `NEXTAUTH_SECRET`, `PASSWORD_ENCRYPTION_KEY`, the database password, or the admin password. Keep `PASSWORD_ENCRYPTION_KEY` unchanged after accounts are created, otherwise saved student passwords cannot be decrypted.

## 2. First deployment

Before starting nginx, obtain a Let's Encrypt certificate using a temporary HTTP certificate flow or Certbot webroot. Store certificates under `ops/certbot/conf`. Then run:

```bash
node --env-file=.env.production scripts/check-production-env.mjs
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate node prisma/seed.js
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate node prisma/seed-texts.js
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Verify `https://YOUR_DOMAIN/api/health`, admin login, student login, one saved typing result, one assignment, and password viewing in the admin panel.

## 3. Backups

Create a protected backup directory and run a daily backup:

```bash
mkdir -p backups
chmod 700 backups
sh ops/backup-postgres.sh
```

Example cron entry for 02:30 every night:

```cron
30 2 * * * cd /opt/nova-type && /bin/sh ops/backup-postgres.sh >> /var/log/nova-backup.log 2>&1
```

Copy encrypted backups to a second machine or object storage. Keep at least 14 daily and 3 monthly copies. Test restoration on a separate database every month. Restoration requires an explicit confirmation variable:

```bash
CONFIRM_RESTORE=RESTORE_NOVA_TYPE sh ops/restore-postgres.sh backups/nova-type-TIMESTAMP.dump
```

## 4. Updates

Back up first, build the new image, apply migrations, then restart:

```bash
sh ops/backup-postgres.sh
docker compose --env-file .env.production -f docker-compose.production.yml build app migrate
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

## 5. Operational checklist

- HTTPS redirects and HSTS work.
- `/api/health` is monitored every minute.
- Database and disk usage alerts are enabled.
- `.env.production`, backups, and private keys are readable only by the deployment user.
- Admin password is changed from the initial value and stored in a password manager.
- Restore procedure is tested regularly.
- Security updates for the VPS and Docker images are installed monthly.
- Logs are rotated and retained without recording student passwords.
