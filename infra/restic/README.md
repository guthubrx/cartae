# Restic Backup System - Session 81e

Automated backup and disaster recovery system for Cartae infrastructure.

## 📁 Directory Structure

```
restic/
├── scripts/
│   ├── backup.sh              # Main backup orchestration
│   ├── backup-postgres.sh     # PostgreSQL backup (pg_dump)
│   ├── backup-redis.sh        # Redis backup (RDB snapshot)
│   ├── restore.sh             # Main restore orchestration
│   ├── restore-postgres.sh    # PostgreSQL restore
│   ├── restore-redis.sh       # Redis restore
│   └── test-backup.sh         # Backup system validation
├── crontab                    # Cron configuration
└── .env.example              # Environment variables template
```

## 🚀 Quick Start

### 1. Configuration

Copy environment template and configure:

```bash
cp .env.example .env
vim .env  # Fill in your values
```

**Required variables:**
- `RESTIC_PASSWORD` - Encryption password (generate with `openssl rand -base64 32`)
- `POSTGRES_PASSWORD` - PostgreSQL password
- `RESTIC_BACKUP_PATH` - Local backup storage path

### 2. Start Backup Container

```bash
cd /path/to/cartae
docker-compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.backup.yml \
               up -d restic-backup
```

### 3. Verify Setup

```bash
# Enter container
docker exec -it cartae-restic-backup sh

# Run tests
/scripts/test-backup.sh
```

### 4. Manual Backup

```bash
# Full backup
docker exec cartae-restic-backup /scripts/backup.sh all

# PostgreSQL only
docker exec cartae-restic-backup /scripts/backup.sh postgres

# Redis only
docker exec cartae-restic-backup /scripts/backup.sh redis

# Volumes only
docker exec cartae-restic-backup /scripts/backup.sh volumes
```

## 📅 Automated Backups

Backups run automatically via cron:

- **Daily backup** - 02:00 UTC (full backup: postgres + redis + volumes)
- **Weekly integrity check** - Sunday 03:00 UTC (10% data sample)
- **Monthly prune** - 1st of month 04:00 UTC (cleanup old snapshots)

**Retention policy:**
- Keep 7 daily backups
- Keep 4 weekly backups
- Keep 12 monthly backups

## 🔄 Disaster Recovery

### Full System Restore

```bash
# List available snapshots
docker exec cartae-restic-backup restic snapshots

# Restore everything from latest snapshot
docker exec cartae-restic-backup /scripts/restore.sh all latest

# Restore from specific snapshot
docker exec cartae-restic-backup /scripts/restore.sh all a1b2c3d4
```

### PostgreSQL Only Restore

```bash
# Restore latest PostgreSQL backup
docker exec cartae-restic-backup /scripts/restore-postgres.sh latest

# Restore specific snapshot
docker exec cartae-restic-backup /scripts/restore-postgres.sh a1b2c3d4
```

### Redis Only Restore

```bash
# Restore latest Redis backup
docker exec cartae-restic-backup /scripts/restore-redis.sh latest

# After restore, manually restart Redis
docker restart cartae-redis
```

## 📊 Monitoring

Backup metrics are pushed to Prometheus Pushgateway (if configured):

**Metrics exposed:**
- `backup_success` - Backup success/failure (1/0)
- `backup_size_bytes` - Backup size in bytes
- `backup_timestamp` - Last backup timestamp
- `backup_total_size_bytes` - Total repository size

**Grafana Dashboard:**
See `BACKUP-DR-ARCHITECTURE.md` for dashboard examples.

## 🧪 Testing

### Run Full Test Suite

```bash
docker exec cartae-restic-backup /scripts/test-backup.sh
```

Tests verify:
- Restic repository accessibility
- Scripts existence and permissions
- Environment variables
- PostgreSQL/Redis connectivity
- Disk space availability
- Repository integrity
- Monitoring integration

### Manual Integrity Check

```bash
# Quick check (5% sample)
docker exec cartae-restic-backup restic check --read-data-subset=5%

# Full check (slow!)
docker exec cartae-restic-backup restic check --read-data
```

## 🔐 Security

**Encryption:**
- All backups encrypted with AES-256
- Repository password required for access
- Store password securely (Vault, env vars)

**Access Control:**
- Backup container runs with minimal privileges
- Read-only mounts for data sources
- Network isolation (monitoring-network only)

**S3 Backend:**
If using S3, configure IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-backup-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-backup-bucket"
    }
  ]
}
```

## 📈 Repository Management

### List Snapshots

```bash
docker exec cartae-restic-backup restic snapshots
```

### Repository Statistics

```bash
docker exec cartae-restic-backup restic stats
```

### Manual Prune

```bash
docker exec cartae-restic-backup restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --prune
```

### Unlock Repository (if locked)

```bash
docker exec cartae-restic-backup restic unlock
```

## 🛠️ Troubleshooting

### Backup Fails

**Check logs:**
```bash
docker logs cartae-restic-backup
tail -f /path/to/backups/logs/backup_*.log
```

**Common issues:**
- Repository not initialized → Run `restic init`
- Wrong password → Check `RESTIC_PASSWORD`
- Disk full → Check `df -h` on backup volume
- PostgreSQL unreachable → Check `POSTGRES_HOST`

### Restore Fails

**PostgreSQL restore fails:**
- Check database is accessible
- Verify backup file exists in snapshot
- Ensure sufficient disk space

**Redis restore fails:**
- Stop Redis before restoring RDB file
- Check file permissions
- Verify Redis data directory path

### Repository Locked

If backup fails with "repository is already locked":

```bash
# Check for stale locks
docker exec cartae-restic-backup restic list locks

# Remove stale locks (CAREFUL!)
docker exec cartae-restic-backup restic unlock
```

## 📚 Documentation

For complete documentation, see:
- `BACKUP-DR-ARCHITECTURE.md` - Full architecture and procedures
- `.env.example` - Configuration reference
- Individual script comments for detailed usage

## 🎯 RTO/RPO Targets

**Recovery Time Objective (RTO):** 4 hours
- Time to fully restore production system from backup

**Recovery Point Objective (RPO):** 24 hours
- Maximum acceptable data loss (daily backups at 02:00 UTC)

## 🔗 Related Sessions

- **Session 81a** - Network Segmentation & Firewall
- **Session 81b** - TLS/mTLS End-to-End
- **Session 81c** - Redis Cache + Queue
- **Session 81d** - Monitoring + Observability

---

**Session 81e - Backup & Disaster Recovery**
*Automated, encrypted, monitored backups with disaster recovery procedures*
