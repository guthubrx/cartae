# Restic Offsite Backup - S3/B2 Setup Guide

**Session 86 - Production Hardening**
**Objectif :** Backup offsite cloud (disaster recovery)

---

## 🎯 Choix du Provider

### Option A : AWS S3 (Recommandé production)

**Avantages :**
- Haute disponibilité (99.999999999% durability)
- Intégration native AWS ecosystem
- Support multi-région

**Coûts estimés :**
- Stockage Standard : **$0.023/GB/mois**
- 100GB backups × 10 snapshots = **$2.30/mois**
- Transfert sortant : Gratuit si restore depuis EC2 même région

**Configuration :**
```bash
# .env.production (ou .env.{deployment})
RESTIC_REPOSITORY=s3:s3.amazonaws.com/cartae-backups-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=eu-west-1  # ou us-east-1

# Politique rétention production
BACKUP_RETENTION_DAILY=30
BACKUP_RETENTION_WEEKLY=12
BACKUP_RETENTION_MONTHLY=12
```

---

### Option B : Backblaze B2 (Alternative économique)

**Avantages :**
- **4× moins cher** que S3 ($0.005/GB vs $0.023/GB)
- API S3-compatible
- Transfert sortant gratuit (1× download par backup)

**Coûts estimés :**
- Stockage : **$0.005/GB/mois**
- 100GB backups × 10 snapshots = **$0.50/mois** 💰

**Configuration :**
```bash
# .env.production
RESTIC_REPOSITORY=s3:s3.us-west-004.backblazeb2.com/cartae-backups-prod
AWS_ACCESS_KEY_ID=<B2_KEY_ID>
AWS_SECRET_ACCESS_KEY=<B2_APPLICATION_KEY>

# Endpoint B2 spécifique région
RESTIC_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

**Création bucket B2 :**
1. https://www.backblaze.com/b2/sign-up.html
2. Créer bucket `cartae-backups-prod` (private)
3. Générer Application Key (accès S3-compatible)
4. Copier Key ID + Application Key dans `.env`

---

### Option C : Google Cloud Storage (Alternative)

**Configuration :**
```bash
RESTIC_REPOSITORY=gs:cartae-backups-prod:/
GOOGLE_PROJECT_ID=my-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Coûts estimés :**
- Stockage Nearline : **$0.010/GB/mois** (100GB = $1/mois)

---

## 🚀 Setup Étape par Étape

### 1. Créer bucket S3/B2

**AWS S3 :**
```bash
aws s3 mb s3://cartae-backups-prod --region eu-west-1

# Activer versioning (protection accidentelle delete)
aws s3api put-bucket-versioning \
  --bucket cartae-backups-prod \
  --versioning-configuration Status=Enabled

# Lifecycle policy (transition vers Glacier après 90j)
aws s3api put-bucket-lifecycle-configuration \
  --bucket cartae-backups-prod \
  --lifecycle-configuration file://s3-lifecycle.json
```

**s3-lifecycle.json :**
```json
{
  "Rules": [{
    "Id": "ArchiveOldBackups",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 90,
      "StorageClass": "GLACIER"
    }],
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 30
    }
  }]
}
```

---

### 2. Configurer variables d'environnement

**Fichier `.env.production` (root projet) :**
```bash
# ===================================
# Restic Offsite Backup Configuration
# ===================================

# Repository cloud (S3 ou B2)
RESTIC_REPOSITORY=s3:s3.amazonaws.com/cartae-backups-prod

# Credentials AWS/B2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=eu-west-1

# Password encryption Restic (IMPORTANT : sauvegarder dans Vault)
RESTIC_PASSWORD=<généré avec: openssl rand -base64 32>

# Schedule backup (toutes les 6h)
BACKUP_SCHEDULE=0 */6 * * *

# Politique rétention (production)
BACKUP_RETENTION_DAILY=30    # 30 jours quotidiens
BACKUP_RETENTION_WEEKLY=12   # 12 semaines (3 mois)
BACKUP_RETENTION_MONTHLY=12  # 12 mois (1 an)

# Prometheus monitoring
PROMETHEUS_PUSHGATEWAY=http://prometheus:9091
```

---

### 3. Initialiser repository Restic

**Option manuelle (première fois) :**
```bash
# Se connecter au container backup
docker-compose exec restic-backup sh

# Initialiser repo S3
restic init
# Expected: "created restic repository ... at s3:s3.amazonaws.com/..."

# Vérifier
restic snapshots
# Expected: "repository ... opened successfully, no snapshots found"
```

**Option automatique (docker-compose) :**
```yaml
# Déjà configuré dans docker-compose.backup.yml ligne 76-79
command: >
  sh -c "
    if ! restic snapshots > /dev/null 2>&1; then
      restic init || echo 'Repository already initialized';
    fi;
    ...
  "
```

---

### 4. Tester backup manuel

```bash
# Lancer backup manuel (mode all)
docker-compose exec restic-backup /scripts/backup.sh all

# Vérifier snapshots créés
docker-compose exec restic-backup restic snapshots

# Expected:
# ID        Time                 Host        Tags
# ----------------------------------------------------------------------
# a1b2c3d4  2025-01-16 18:30:00  restic      postgres,backup-date-20250116
# e5f6g7h8  2025-01-16 18:30:05  restic      redis,backup-date-20250116
# i9j0k1l2  2025-01-16 18:30:10  restic      volumes,vault,backup-date-20250116
```

---

### 5. Vérifier cron automatique

```bash
# Vérifier cron actif
docker-compose exec restic-backup ps aux | grep crond
# Expected: root ... /usr/sbin/crond -f -l 2

# Voir crontab chargée
docker-compose exec restic-backup crontab -l

# Voir logs cron
docker-compose exec restic-backup tail -f /var/log/restic/cron.log
```

---

### 6. Tester restore (disaster recovery)

```bash
# Lister snapshots disponibles
restic snapshots

# Restore snapshot spécifique
restic restore a1b2c3d4 --target /tmp/restore-test

# Restore dernière version PostgreSQL
restic restore latest --tag postgres --target /tmp/restore-postgres

# Vérifier données restaurées
ls -lh /tmp/restore-postgres/
# Expected: backup_20250116_183000.sql.gz
```

---

## 📊 Politique Rétention par Environnement

### Production (déploiement client)
```bash
BACKUP_RETENTION_DAILY=30    # 1 mois quotidien
BACKUP_RETENTION_WEEKLY=12   # 3 mois hebdomadaire
BACKUP_RETENTION_MONTHLY=12  # 1 an mensuel
# Coût : ~$6.90/mois (300 snapshots × 100GB)
```

### Staging (tests pré-prod)
```bash
BACKUP_RETENTION_DAILY=7     # 1 semaine quotidien
BACKUP_RETENTION_WEEKLY=4    # 1 mois hebdomadaire
BACKUP_RETENTION_MONTHLY=3   # 3 mois mensuel
# Coût : ~$1.15/mois (50 snapshots × 100GB)
```

### Dev (développement)
```bash
BACKUP_RETENTION_DAILY=3     # 3 jours quotidien
BACKUP_RETENTION_WEEKLY=2    # 2 semaines hebdomadaire
BACKUP_RETENTION_MONTHLY=0   # Pas de mensuel
# Coût : ~$0.35/mois (15 snapshots × 100GB)
```

---

## 🔐 Sécurité

### Chiffrement

**Restic chiffre TOUT automatiquement** (AES-256) :
- Données (content)
- Métadonnées (filenames, permissions)
- Index snapshots

**Password Restic :**
```bash
# Générer password fort
openssl rand -base64 32

# Sauvegarder dans Vault (CRITICAL !)
vault kv put secret/restic password="<généré>"

# Backup password offline (papier sécurisé)
echo "<password>" | qrencode -t PNG -o restic-password-qr.png
```

⚠️ **Si password perdu → Backup irrécupérable !**

---

### IAM Policy minimale (AWS)

**Fichier `s3-restic-policy.json` :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:ListBucketMultipartUploads"
    ],
    "Resource": "arn:aws:s3:::cartae-backups-prod"
  }, {
    "Effect": "Allow",
    "Action": [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload"
    ],
    "Resource": "arn:aws:s3:::cartae-backups-prod/*"
  }]
}
```

**Créer user IAM dédié :**
```bash
aws iam create-user --user-name restic-backup
aws iam put-user-policy --user-name restic-backup \
  --policy-name ResticS3Access \
  --policy-document file://s3-restic-policy.json
aws iam create-access-key --user-name restic-backup
```

---

## 🧪 Tests Validation

### Test 1 : Backup fonctionne
```bash
docker-compose exec restic-backup /scripts/backup.sh all
# Expected: ✅ PostgreSQL backup completed
#           ✅ Redis backup completed
#           ✅ Application volumes backup completed
```

### Test 2 : Snapshots sur S3
```bash
restic snapshots
# Expected: Liste 3+ snapshots avec tags postgres/redis/volumes
```

### Test 3 : Restore fonctionne
```bash
restic restore latest --tag postgres --target /tmp/test
gunzip /tmp/test/backup_*.sql.gz
head -50 /tmp/test/backup_*.sql
# Expected: Voir schema PostgreSQL
```

### Test 4 : Rétention appliquée
```bash
# Créer 20 snapshots quotidiens
for i in {1..20}; do
  /scripts/backup.sh all
  sleep 10
done

# Appliquer rétention (keep-daily 7)
restic forget --keep-daily 7 --prune --dry-run
# Expected: "would delete 13 snapshots"
```

### Test 5 : Intégrité repository
```bash
restic check --read-data-subset=10%
# Expected: "no errors were found"
```

---

## 📈 Monitoring

### Métriques Prometheus

**Exposées automatiquement :**
```prometheus
# Succès backup
backup_success{mode="all"} 1

# Taille totale backup
backup_total_size_bytes 10737418240  # 10GB

# Timestamp dernier backup
backup_timestamp 1705428600
```

### Alertes recommandées

**Fichier `prometheus-alerts.yml` :**
```yaml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailed
        expr: backup_success == 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Restic backup failed"

      - alert: BackupStale
        expr: (time() - backup_timestamp) > 28800  # 8h
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "No backup in last 8 hours"
```

---

## 💰 Coûts Réels Exemple

**Production (client démo) :**
- Stockage DB PostgreSQL : 50GB
- Snapshots retenus : 30 daily + 12 weekly + 12 monthly = 54 snapshots
- Compression Restic : ~40% (20GB par snapshot)
- **Total stockage : 54 × 20GB = 1.08TB**
- **Coût S3 Standard : $24.84/mois**
- **Coût B2 : $5.40/mois** ✅

**Recommandation : Backblaze B2 pour prod** (4× économie)

---

## 🆘 Troubleshooting

### Erreur : "unable to open repository"
```bash
# Vérifier credentials AWS
aws s3 ls s3://cartae-backups-prod/

# Vérifier RESTIC_PASSWORD correct
echo $RESTIC_PASSWORD

# Réinitialiser si password oublié (PERTE DONNÉES !)
restic init --repository-file /backups/repo-new
```

### Backup lent (> 1h)
```bash
# Activer compression (déjà actif par défaut)
restic backup --compression max /data

# Réduire fréquence (toutes les 12h au lieu de 6h)
BACKUP_SCHEDULE="0 */12 * * *"
```

### Espace disque S3 élevé
```bash
# Vérifier snapshots inutilisés
restic snapshots --compact

# Forcer prune agressif
restic forget --keep-last 5 --prune
```

---

**Prochaine étape après backup S3/B2 :** Monitoring Grafana + Alertmanager (Item 2)

**Documentation créée :** 16/01/2025
**Session :** 86 - Production Hardening 10/10
