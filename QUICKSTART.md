# ⚡ Cartae - Quick Start (5 minutes)

Installation ultra-rapide de Cartae.

---

## 🎯 Choix du Mode

### Mode 1: Simple (Frontend seulement)

**Pour:** Tester rapidement l'interface
**Durée:** ~2 minutes
**Requirements:** Node.js 18+, pnpm

```bash
git clone https://github.com/guthubrx/cartae.git
cd cartae
./setup.sh simple
```

→ Ouvrir **http://localhost:5173**

✅ Prêt !

---

### Mode 2: Complet (PostgreSQL + Vault + Frontend)

**Pour:** Setup production-ready
**Durée:** ~10 minutes
**Requirements:** Node.js 18+, pnpm, Docker

```bash
git clone https://github.com/guthubrx/cartae.git
cd cartae
./setup.sh full
```

**Suivre les prompts du wizard:**
1. PostgreSQL démarre automatiquement
2. Vault setup (optionnel, répondre Y/N)
3. Config automatique des .env

**Démarrer les services:**

```bash
# Terminal 1 - Database API
cd packages/database-api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev
```

→ **Frontend:** http://localhost:5173
→ **API:** http://localhost:3001/health
→ **pgAdmin:** http://localhost:5050 (`admin@cartae.dev` / `admin`)
→ **Vault UI:** http://localhost:8200 (si installé)

✅ Prêt !

---

## 🧪 Test Rapide

**Stocker un item via API:**

```bash
curl -X POST http://localhost:3001/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "type": "note",
    "title": "Ma première note",
    "content": "Hello Cartae!",
    "tags": ["test"]
  }'
```

**Rechercher:**

```bash
curl "http://localhost:3001/api/search?q=première"
```

✅ Si vous obtenez un résultat JSON, l'API fonctionne !

---

## 📖 Next Steps

- **Guide complet:** [GETTING-STARTED.md](./GETTING-STARTED.md)
- **Documentation API:** [packages/database-api/README.md](./packages/database-api/README.md)
- **Architecture:** [README.md](./README.md)

---

## 🐛 Problèmes Courants

**PostgreSQL port 5432 déjà utilisé:**

```bash
lsof -i :5432
kill -9 <PID>
```

**npm workspace errors:**

```bash
npm install -g pnpm
pnpm install
```

**Docker not running:**

```
Lancez Docker Desktop et réessayez
```

---

**Support:** https://github.com/guthubrx/cartae/issues

---

🎉 **Enjoy Cartae !**
