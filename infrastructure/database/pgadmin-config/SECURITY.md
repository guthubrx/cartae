# Sécurité - Bonnes Pratiques

## 🔐 Credentials & Secrets

### Développement Local

**Fichiers avec credentials :**

- ✅ `.env` → Contient les mots de passe (IGNORÉ par Git)
- ✅ `.env.example` → Template sans secrets (COMMITÉ)
- ✅ `pgadmin-config/pgpass` → Auto-généré depuis .env (IGNORÉ par Git)
- ✅ `pgadmin-config/pgpass.example` → Template (COMMITÉ)

### Production

**⚠️ JAMAIS en clair dans le code ou Docker images !**

**Solutions recommandées :**

1. **Variables d'environnement (serveur CI/CD)**

   ```bash
   # GitHub Actions, GitLab CI, etc.
   POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}
   ```

2. **Gestionnaire de secrets**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - Docker Secrets (Swarm)

3. **Fichier .env sur le serveur (pas dans Git)**
   ```bash
   # Sur le serveur de production seulement
   scp .env.production serveur:/app/.env
   ```

---

## 🔑 Générer des Mots de Passe Forts

**Pour production :**

```bash
# PostgreSQL password
openssl rand -base64 32

# pgAdmin password
openssl rand -base64 32
```

Copie-colle dans `.env` :

```env
POSTGRES_PASSWORD=A7b9C2d4E5f6G7h8...  # 32 caractères aléatoires
PGADMIN_PASSWORD=X1y2Z3a4B5c6D7e8...  # 32 caractères aléatoires
```

---

## 📋 Checklist Sécurité

### Avant de Commiter

- [ ] ✅ `.env` est dans `.gitignore`
- [ ] ✅ `pgadmin-config/pgpass` est dans `.gitignore`
- [ ] ✅ Pas de mots de passe en clair dans `docker-compose.yml`
- [ ] ✅ Pas de credentials dans les fichiers SQL

### Avant de Déployer en Production

- [ ] ✅ Mots de passe forts (32+ caractères aléatoires)
- [ ] ✅ Mots de passe différents dev vs prod
- [ ] ✅ Utilise un gestionnaire de secrets
- [ ] ✅ PostgreSQL accessible uniquement depuis réseau privé
- [ ] ✅ pgAdmin désactivé OU protégé par VPN
- [ ] ✅ SSL/TLS activé pour PostgreSQL
- [ ] ✅ Backups chiffrés

---

## 🚫 Ce qu'il NE FAUT PAS Faire

❌ **Commiter `.env` dans Git**

```bash
# BAD
git add .env
git commit -m "Add config"
```

❌ **Hardcoder les credentials**

```yaml
# BAD - docker-compose.yml
environment:
  POSTGRES_PASSWORD: 'mon_super_password' # NE JAMAIS FAIRE ÇA !
```

❌ **Partager .env par email/Slack**

```
# BAD
Hey, voici le fichier .env avec les passwords...
```

✅ **Utiliser un gestionnaire de mots de passe** (1Password, LastPass, Bitwarden)

---

## 🔄 Rotation des Mots de Passe

**Fréquence recommandée (production) :**

- PostgreSQL : Tous les 90 jours
- pgAdmin : Tous les 90 jours
- Après un départ d'employé : Immédiatement

**Procédure :**

1. Générer nouveau mot de passe : `openssl rand -base64 32`
2. Mettre à jour `.env` sur serveur
3. Mettre à jour secret manager (si utilisé)
4. Redémarrer les services : `docker compose restart`
5. Tester connexions
6. Invalider ancien mot de passe

---

## 📧 Contact Sécurité

Si tu découvres une faille de sécurité, **NE PAS créer d'issue publique GitHub**.

Contacte l'équipe en privé.
