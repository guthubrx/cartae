# 🚀 Cartae - Roadmap Complète des Fonctionnalités

**Date :** 3 Novembre 2025
**Total Features :** 52
**Organisation :** Par priorité et catégorie

---

## 📋 Légende

**Priorités :**
- 🔴 **P0 - Critical** : MVP indispensable (Q4 2025 - Nov-Déc) - 13 features
- 🟠 **P1 - High** : Post-MVP prioritaire (Q1 2026 - Jan-Mar) - 19 features
- 🟡 **P2 - Medium** : Features importantes (Q2 2026 - Avr-Juin) - 13 features
- 🟢 **P3 - Low** : Nice-to-have (Q3 2026+) - 7 features

**Statuts :**
- ✅ **Complété** : Feature déjà développée
- 🚧 **En cours** : Développement actif
- 📋 **Planifié** : Roadmap future
- 💡 **Optionnel** : À valider

---

## 🔴 P0 - CRITICAL (MVP - Q4 2025 - Nov-Déc)

### 🏗️ CORE INFRASTRUCTURE

#### 📦 **Format CartaeItem**
- **Description :** Format universel JSON pour tous items (emails, notes, tasks, events)
- **Concurrent :** Notion (blocks), Obsidian (Markdown)
- **Bénéfice :** Interopérabilité totale, migration facile depuis concurrents
- **Status :** ✅ Complété - `@cartae/core`

#### ⚡ **Event Bus**
- **Description :** Système pub/sub pour communication découplée entre modules
- **Concurrent :** Standard architecture (Redux, EventEmitter)
- **Bénéfice :** Extensibilité, plugins tiers, scalabilité architecture
- **Status :** ✅ Complété - `@cartae/core`

#### 💾 **Storage Local (IndexedDB)**
- **Description :** Persistence IndexedDB offline-first
- **Concurrent :** Obsidian (local), Notion (cloud + cache)
- **Bénéfice :** Offline-first, performance, privacy utilisateur
- **Status :** ✅ Complété - `@cartae/core`

#### 🔌 **Plugin System**
- **Description :** Registry + loader + sandbox pour plugins tiers
- **Concurrent :** Obsidian (1000+ plugins), VSCode
- **Bénéfice :** Écosystème communautaire, marketplace revenue (30%)
- **Status :** ✅ Complété - `@cartae/plugin-system`

#### 🛠️ **Plugin SDK**
- **Description :** API développeurs avec types TypeScript + documentation
- **Concurrent :** Obsidian API, Notion API
- **Bénéfice :** Adoption dev, plugins communautaires, showcase qualité
- **Status :** ✅ Complété - `@cartae/plugin-sdk`

#### 📦 **File Upload & Storage**
- **Description :** Système upload fichiers avec quotas par plan (attachments, images, documents)
- **Concurrent :** Notion (unlimited uploads payant), Obsidian (local illimité)
- **Bénéfice :** Requis pour Gmail/Office365 connectors, MindMap assets. Quotas : FREE 10MB, STARTER 100MB, PRO 5GB, BUSINESS 50GB/user
- **Status :** 📋 Planifié - `@cartae/file-storage` (PRIVATE)
- **Prix unitaire :** Inclus dans plans (coût storage S3/R2)

#### ⚖️ **Quota Management System**
- **Description :** Infrastructure enforcement limites (items, storage, API calls) par plan
- **Concurrent :** Standard SaaS (tous)
- **Bénéfice :** Monétisation plans (FREE limité, PRO/BUSINESS unlimited). Soft limits + hard limits. Monitoring usage temps réel
- **Status :** 📋 Planifié - `@cartae/quota-manager` (PRIVATE)
- **Prix unitaire :** Infrastructure backend (pas vendu séparément)

---

### 🧠 CORE BUSINESS

#### 🧠 **MindMap Core**
- **Description :** Canvas interactif, nodes/edges, algorithmes layout auto. **Quotas : FREE 100 nodes, STARTER 500 nodes, PRO/BUSINESS unlimited (infinite canvas)**
- **Concurrent :** Miro (whiteboard), Xmind (mindmap)
- **Bénéfice :** Cœur métier Cartae, différenciation vs Notion/Obsidian
- **Status :** 🚧 En cours - `@cartae/mindmap-core` (PRIVATE)
- **Prix unitaire :** $4/mo

#### 📝 **Rich Text Editor**
- **Description :** Éditeur Markdown/WYSIWYG avec slash commands
- **Concurrent :** Notion (blocks editor), Obsidian (Markdown)
- **Bénéfice :** Expérience édition fluide, compétitif Notion
- **Status :** 📋 Planifié - `@cartae/editor` (PRIVATE)

---

### 🤖 AI INTELLIGENCE

#### 🤖 **LLM Service**
- **Description :** Abstraction multi-providers (OpenAI, Anthropic, local)
- **Concurrent :** Aucun (différenciation unique)
- **Bénéfice :** Foundation AI, rate limiting, cache, fallback
- **Status :** ✅ Complété - Session 45 (PRIVATE)
- **Prix unitaire :** $3/mo

#### ⚙️ **AI Plugin Registry**
- **Description :** Orchestration multi-plugins AI, agrégation insights
- **Concurrent :** Aucun
- **Bénéfice :** Architecture extensible, AI marketplace futur
- **Status :** ✅ Complété - Session 45 (PRIVATE)

#### 🔗 **Semantic Connections**
- **Description :** Graph sémantique auto via TF-IDF + cosine similarity
- **Concurrent :** Roam/Obsidian (manuel), aucun auto
- **Bénéfice :** Killer feature, discovery automatique
- **Status :** ✅ Complété - Session 45 (PRIVATE)
- **Prix unitaire :** $6/mo

---

### 📱 APPS & INFRASTRUCTURE

#### 🌐 **Web App**
- **Description :** Application React + Vite avec routing, auth, UI
- **Concurrent :** Notion (web), Obsidian (Electron)
- **Bénéfice :** Produit principal, tous plans, cross-platform
- **Status :** 🚧 En cours - `apps/web` (PRIVATE)

#### 🔐 **API Backend**
- **Description :** Node.js/Express avec auth, sync, collaboration
- **Concurrent :** Notion API, Linear API
- **Bénéfice :** Sécurité, sync cloud, collab temps réel
- **Status :** 🚧 En cours - `apps/api` (PRIVATE)

---

## 🟠 P1 - HIGH (Post-MVP - Q1 2026 - Jan-Mar)

### 🎨 DESIGN & UX

#### 🎨 **Design System**
- **Description :** Tokens (couleurs, spacing, typography) + composants React
- **Concurrent :** Shadcn/ui, Radix UI
- **Bénéfice :** Cohérence UI, efficacité dev, brand consistency
- **Status :** ✅ Complété - `@cartae/design` + `@cartae/ui`

#### 🔄 **Parsers Import/Export**
- **Description :** Conversion .xmind, .mm, .json, .opml, Markdown
- **Concurrent :** Notion (import/export), Obsidian (Markdown)
- **Bénéfice :** Migration depuis Xmind/MindNode, interopérabilité
- **Status :** ✅ Complété - `@cartae/parsers`

---

### 🧠 CORE BUSINESS (Suite)

#### 🔗 **Bidirectional Links**
- **Description :** Liens automatiques entre items, backlinks
- **Concurrent :** Roam Research (killer feature), Obsidian
- **Bénéfice :** Graph de connaissance, networked thought
- **Status :** 📋 Planifié - `@cartae/core` (PRIVATE)

#### 📚 **Databases/Collections**
- **Description :** Tables avec propriétés custom, relations, formules
- **Concurrent :** Notion (databases), Airtable
- **Bénéfice :** Organisation avancée, use cases CRM/project mgmt
- **Status :** 📋 Planifié - `@cartae/databases` (PRIVATE)

---

### 📊 VUES & VISUALISATIONS

#### 📋 **Vue Kanban**
- **Description :** Board Trello-style avec drag & drop
- **Concurrent :** Notion, Trello, Linear, Jira
- **Bénéfice :** Standard attendu, project management, agile teams
- **Status :** ✅ Complété - `@cartae/viz-kanban` (PUBLIC)

#### 📊 **Vue Table**
- **Description :** Spreadsheet avec tri, filtres, colonnes custom
- **Concurrent :** Notion (table view), Airtable, Excel
- **Bénéfice :** Standard attendu, data analysis, CRM
- **Status :** ✅ Complété - `@cartae/viz-table` (PUBLIC)

---

### 👥 COLLABORATION (B2B Critical)

#### ⚡ **Real-time Collaboration**
- **Description :** Édition simultanée multi-users avec cursors
- **Concurrent :** Notion, Google Docs, Miro
- **Bénéfice :** Must-have B2B, plan BUSINESS, teamwork fluide
- **Status :** 📋 Planifié - `@cartae/collaboration` (PRIVATE)

#### 💬 **Comments & Mentions**
- **Description :** Commentaires inline avec @mentions notifications
- **Concurrent :** Notion, Google Docs, Slack
- **Bénéfice :** Communication asynchrone, feedback loops
- **Status :** 📋 Planifié - `@cartae/comments` (PRIVATE)

#### 🔐 **Permissions Granulaires**
- **Description :** ACL par item/workspace (read/write/admin)
- **Concurrent :** Notion (permissions), Google Workspace
- **Bénéfice :** Sécurité entreprise, compliance, RGPD
- **Status :** 📋 Planifié - `@cartae/permissions` (PRIVATE)

---

### 🔗 CONNECTORS (Monétisation)

#### ✉️ **Gmail Connector**
- **Description :** Sync emails bidirectionnel, parsing, search
- **Concurrent :** Microsoft 365 (Outlook), Spark
- **Bénéfice :** PRO plan, productivité email → tasks
- **Status :** ✅ Complété - Session 41-42 (PRIVATE)
- **Prix unitaire :** $5/mo

#### 💬 **Slack Connector**
- **Description :** Sync messages, webhooks, bot commands
- **Concurrent :** Notion (Slack integration), Zapier
- **Bénéfice :** BUSINESS plan, B2B teams collaboration
- **Status :** ✅ Complété - Session 43-44 (PRIVATE)
- **Prix unitaire :** $8/mo

#### 📧 **Office365 Connector**
- **Description :** Outlook + OneDrive + Teams sync
- **Concurrent :** Native MS365, Google Workspace
- **Bénéfice :** BUSINESS plan, B2B entreprises
- **Status :** ✅ Complété - `office365-connector` (PRIVATE requis)
- **Prix unitaire :** $12/mo

---

### 🤖 AI INTELLIGENCE (Suite)

#### ⭐ **Priority Scorer**
- **Description :** Scoring intelligent 0-10 via LLM avec reasoning
- **Concurrent :** Linear (triage basic), aucun AI avancé
- **Bénéfice :** Productivité massive, triage auto
- **Status :** ✅ Complété - Session 45 (PRIVATE)
- **Prix unitaire :** $4/mo

#### 😊 **Sentiment Analyzer**
- **Description :** Analyse ton émotionnel, toxicité, urgence
- **Concurrent :** Aucun
- **Bénéfice :** Insights RH, moral équipe, customer support
- **Status :** ✅ Complété - Session 45 (PRIVATE)
- **Prix unitaire :** $4/mo

#### 🔍 **Semantic Search**
- **Description :** Recherche sémantique via embeddings + vector store
- **Concurrent :** Notion/Obsidian (keyword only)
- **Bénéfice :** Killer feature, discovery amélioré
- **Status :** 📋 Planifié - Session 46 (PRIVATE)
- **Prix unitaire :** $8/mo

#### 💡 **Smart Recommendations**
- **Description :** Suggestions liens/items similaires contextuels
- **Concurrent :** Roam (backlinks only), aucun AI
- **Bénéfice :** Discovery, serendipity, connections
- **Status :** 📋 Planifié - Session 47 (PRIVATE)
- **Prix unitaire :** $4/mo

#### 🏷️ **Auto-Tagging NLP**
- **Description :** Extraction automatique tags/keywords via NLP
- **Concurrent :** Notion (manual), Craft (basic AI)
- **Bénéfice :** Gain temps, organisation auto
- **Status :** 📋 Planifié - Session 48 (PRIVATE)
- **Prix unitaire :** $5/mo

---

### 📱 APPS (Suite)

#### 💻 **Desktop App**
- **Description :** Electron app offline-first avec sync
- **Concurrent :** Obsidian (desktop), Notion (desktop)
- **Bénéfice :** Offline users, performance native, PRO plan
- **Status :** 📋 Planifié - `apps/desktop` (PRIVATE)
- **Prix :** $49 one-time OU inclus PRO+

#### 🔒 **Auth & SSO**
- **Description :** OAuth (Google, Microsoft), SAML SSO entreprise
- **Concurrent :** Notion (SSO), Google Workspace (SSO)
- **Bénéfice :** Sécurité entreprise, BUSINESS plan, compliance
- **Status :** 📋 Planifié - `@cartae/auth` (PRIVATE)

#### ☁️ **Cloud Sync**
- **Description :** Sync bidirectionnel cloud avec conflict resolution
- **Concurrent :** Notion (cloud), Obsidian Sync
- **Bénéfice :** Multi-device, tous plans, backup automatique
- **Status :** 📋 Planifié - `@cartae/sync` (PRIVATE)

---

### ⚙️ SYSTÈME & ADMIN

#### 🔐 **Admin Dashboard**
- **Description :** Interface admin users, permissions, analytics
- **Concurrent :** Notion (admin), Google Workspace Admin
- **Bénéfice :** BUSINESS plan, gestion équipes, compliance
- **Status :** 📋 Planifié - `@cartae/plugin-admin` (PRIVATE)

#### 🔍 **Global Search**
- **Description :** Recherche fulltext rapide cross-workspace
- **Concurrent :** Notion (search), Obsidian (search)
- **Bénéfice :** Productivité discovery, standard attendu
- **Status :** 📋 Planifié - `@cartae/search` (PRIVATE)

---

## 🟡 P2 - MEDIUM (Q2 2026 - Avr-Juin)

### 📊 VUES & VISUALISATIONS (Suite)

#### 📅 **Vue Timeline/Gantt**
- **Description :** Timeline chronologique pour planification projets
- **Concurrent :** Notion (timeline), Asana, ClickUp, Monday
- **Bénéfice :** Project management, deadlines visuels
- **Status :** 📋 Planifié - `@cartae/viz-timeline` (PUBLIC)

#### 📆 **Vue Calendar**
- **Description :** Calendrier mensuel/hebdomadaire pour events
- **Concurrent :** Notion (calendar), Google Calendar
- **Bénéfice :** Gestion événements, meetings, deadlines
- **Status :** 📋 Planifié - `@cartae/viz-calendar` (PUBLIC)

#### 🕸️ **Graph Network 3D**
- **Description :** Visualisation graph force-directed interactif
- **Concurrent :** Roam Research (graph), Obsidian (graph)
- **Bénéfice :** Exploration connexions, discovery insights
- **Status :** 📋 Planifié - `@cartae/viz-graph` (PUBLIC)

---

### 👥 COLLABORATION (Suite)

#### 🔍 **Activity Log**
- **Description :** Historique modifications avec diff, blame, restore
- **Concurrent :** Notion (page history), Git (version control)
- **Bénéfice :** Audit trail, rollback erreurs, accountability
- **Status :** 📋 Planifié - `@cartae/history` (PRIVATE)

#### 📜 **Version History & Restore**
- **Description :** Historique complet modifications avec diff, restore versions précédentes
- **Concurrent :** Notion (30-90 jours), Google Docs (illimité)
- **Bénéfice :** Compliance, audit trail, undo complexe. Quotas : FREE 7j, STARTER 30j, PRO 90j, BUSINESS 1 an
- **Status :** 📋 Planifié - Extension `@cartae/history` (PRIVATE)
- **Prix unitaire :** $2/mo (coût storage snapshots)

---

### 🔗 CONNECTORS (Suite)

#### 📝 **Notion Connector**
- **Description :** Import/export + sync bidirectionnel API
- **Concurrent :** Migration path depuis Notion
- **Bénéfice :** Acquisition users Notion, migration facilitée
- **Status :** 📋 Planifié - `@cartae/notion-connector` (PUBLIC)
- **Prix unitaire :** $3/mo (sync avancé)

#### ✓ **Linear Connector**
- **Description :** Import issues + sync bidirectionnel
- **Concurrent :** Intégration dev teams (GitHub, Jira)
- **Bénéfice :** Use case dev teams, project management
- **Status :** 📋 Planifié - `@cartae/linear-connector` (PUBLIC)
- **Prix unitaire :** $3/mo (sync avancé)

#### 🐙 **GitHub Connector**
- **Description :** Sync issues, PRs, projects, webhooks
- **Concurrent :** Linear (GitHub sync), Notion
- **Bénéfice :** Dev teams, product management, changelogs
- **Status :** 📋 Planifié - `@cartae/github-connector` (PUBLIC)

---

### 🤖 AI INTELLIGENCE (Suite)

#### 📈 **AI Dashboard**
- **Description :** Analytics AI (insights qualité, métriques, trends)
- **Concurrent :** Aucun
- **Bénéfice :** Premium B2B, ROI AI, business intelligence
- **Status :** 📋 Planifié - Session 49 (PRIVATE)
- **Prix unitaire :** $10/mo

#### 📝 **AI Writing Assistant**
- **Description :** Autocomplete, rewrite, summarize, translate
- **Concurrent :** Notion AI ($8 extra), Claude, ChatGPT
- **Bénéfice :** Productivité rédaction, compétitif Notion AI
- **Status :** 📋 Planifié - `@cartae/ai-writing` (PRIVATE)

---

### 📱 APPS (Suite)

#### 📱 **Mobile App (iOS/Android)**
- **Description :** React Native app avec sync offline
- **Concurrent :** Notion (mobile), Obsidian (mobile)
- **Bénéfice :** Mobile users, capture on-the-go, PRO plan
- **Status :** 📋 Planifié - `apps/mobile` (PRIVATE)

---

### ⚙️ SYSTÈME & ADMIN (Suite)

#### 🛒 **Marketplace**
- **Description :** Store plugins avec pricing, revenue share (30%)
- **Concurrent :** Obsidian (community plugins), VSCode
- **Bénéfice :** Revenue stream (30% commission), écosystème
- **Status :** 📋 Planifié - `@cartae/plugin-marketplace` (PRIVATE)

#### 📊 **Analytics & Telemetry**
- **Description :** Usage metrics, performance monitoring, crash reports
- **Concurrent :** Standard SaaS (Mixpanel, Amplitude)
- **Bénéfice :** Product insights, churn prevention, optimization
- **Status :** 📋 Planifié - `@cartae/analytics` (PRIVATE)

#### 🔔 **Notifications System**
- **Description :** Push, email, in-app notifications avec preferences
- **Concurrent :** Notion (notifications), Slack
- **Bénéfice :** Engagement users, real-time updates, reminders
- **Status :** 📋 Planifié - `@cartae/notifications` (PRIVATE)

#### 🗃️ **Soft Delete & Archiving**
- **Description :** Suppression soft (archive) + restore 30j avant hard delete
- **Concurrent :** Gmail (Trash 30j), Notion (Trash 30j)
- **Bénéfice :** Respect quotas sans perte données, compliance, protection erreurs utilisateur
- **Status :** 📋 Planifié - Extension `@cartae/core` (PRIVATE)
- **Prix unitaire :** Inclus dans plans

---

## 🟢 P3 - LOW (Nice-to-Have - Q3 2026+)

### 📊 VUES (Suite)

#### 📸 **Vue Gallery**
- **Description :** Grid d'images/cartes avec preview
- **Concurrent :** Notion (gallery), Pinterest
- **Bénéfice :** Use case créatif, portfolio, mood boards
- **Status :** 💡 Optionnel - `@cartae/viz-gallery` (PUBLIC)

---

### 🔗 CONNECTORS (Suite)

#### 📋 **Trello Connector**
- **Description :** Import boards + sync cards
- **Concurrent :** Migration path Trello users
- **Bénéfice :** Acquisition Trello users (en déclin)
- **Status :** 💡 Optionnel - `@cartae/trello-connector` (PUBLIC)

---

### 🤖 AI (Suite)

#### 🎨 **AI Image Generation**
- **Description :** Génération images via DALL-E/Midjourney/Stable Diffusion
- **Concurrent :** Notion AI (limité), ChatGPT
- **Bénéfice :** Créatif, mood boards, mockups rapides
- **Status :** 💡 Optionnel - `@cartae/ai-images` (PRIVATE)

---

### 🚀 AVANCÉ

#### 🎙️ **Voice Notes**
- **Description :** Enregistrement audio avec transcription AI
- **Concurrent :** Notion (audio), Otter.ai
- **Bénéfice :** Capture mobile rapide, meetings notes
- **Status :** 💡 Optionnel - `@cartae/voice` (PRIVATE)

#### 🖼️ **OCR & Document Scanning**
- **Description :** Extraction texte depuis images/PDFs
- **Concurrent :** Notion (OCR), Evernote
- **Bénéfice :** Digitalisation documents physiques
- **Status :** 💡 Optionnel - `@cartae/ocr` (PRIVATE)

#### 🤖 **Workflow Automation**
- **Description :** Zapier-style automation rules entre apps
- **Concurrent :** Notion (automation), Zapier, Make
- **Bénéfice :** Power users, intégrations custom, productivity
- **Status :** 💡 Optionnel - `@cartae/automation` (PRIVATE)

#### 🌍 **Publish to Web**
- **Description :** Publication publique sites/docs avec custom domain
- **Concurrent :** Notion (publish), Obsidian Publish ($8-20)
- **Bénéfice :** Blogs, documentation publique, portfolio
- **Status :** 💡 Optionnel - `@cartae/publish` (PRIVATE)

#### 🎨 **Themes & Customization**
- **Description :** Thèmes custom CSS, dark mode, plugins UI
- **Concurrent :** Obsidian (themes), Notion (dark mode)
- **Bénéfice :** Personnalisation, brand identity, UX preferences
- **Status :** 💡 Optionnel - `@cartae/themes` (PUBLIC)

---

## 📊 Résumé par Priorité

| Priorité | Count | Timeline | Budget Estimé | Focus |
|----------|-------|----------|---------------|-------|
| 🔴 **P0 - Critical** | 13 | Q4 2025 (Nov-Déc) | 2 mois | MVP fonctionnel + Infrastructure |
| 🟠 **P1 - High** | 19 | Q1 2026 (Jan-Mar) | 3 mois | Post-MVP + B2B |
| 🟡 **P2 - Medium** | 13 | Q2 2026 (Avr-Juin) | 3 mois | Scale + Mobile |
| 🟢 **P3 - Low** | 7 | Q3 2026+ | À définir | Nice-to-have |
| **TOTAL** | **52** | **8+ mois** | — | **+4 features infrastructure** |

---

## 🎯 Différenciation Compétitive

### **vs Notion**
- ✅ Graph sémantique AI (Notion = manuel)
- ✅ Priority scorer LLM (Notion = basique)
- ✅ Sentiment analyzer (Notion = aucun)
- ✅ Semantic search (Notion = keyword only)
- ✅ AI inclus dans prix (Notion = +$8/mo extra)

### **vs Obsidian**
- ✅ Collaboration temps réel (Obsidian = local-only)
- ✅ Connectors B2B (Office365, Slack, Gmail)
- ✅ AI complet 9 features (Obsidian = 0 AI)
- ✅ Cloud sync natif (Obsidian Sync = $4-10 extra)

### **vs Roam Research**
- ✅ Graph sémantique AI automatique (Roam = manuel)
- ✅ Vues multiples (Kanban, Table, Timeline, Calendar)
- ✅ Connectors B2B
- ✅ AI Intelligence (Priority, Sentiment, Search, Reco)
- ✅ Prix -35% ($9 vs $13.75)

### **vs Linear**
- ✅ Knowledge management complet
- ✅ MindMap & visual thinking
- ✅ Graph sémantique AI
- ✅ AI avancé (Linear = AI basic only)
- ✅ All-in-one (Linear = project mgmt only)

### **vs Miro**
- ✅ Knowledge management structuré
- ✅ AI Intelligence
- ✅ Connectors données (Office365, Slack, Gmail)
- ✅ Databases relationnelles
- ✅ All-in-one (Miro = whiteboard only)

### **vs Slack**
- ✅ Knowledge management persistant
- ✅ MindMap & visual organization
- ✅ AI Intelligence 9 features
- ✅ Structured data (databases, vues)
- ✅ All-in-one (Slack = chat only)

---

## 💎 **Cartae Unique Value Proposition**

**Seul outil qui combine :**
1. 🧠 **MindMap** (pensée visuelle)
2. 📚 **Knowledge Management** (docs, databases, wiki)
3. 🤖 **AI Intelligence** (9 features vs 0-3 concurrents)
4. 🔗 **Connectors B2B** (Office365, Slack, Gmail)
5. 📊 **Vues multiples** (Kanban, Table, Timeline, Calendar, Graph)
6. 👥 **Collaboration** (temps réel, comments, permissions)

**= Remplace Notion + Miro + Slack + Linear + Roam en un seul outil**

---

*Document maintenu par : Claude Code*
*Dernière mise à jour : 3 Novembre 2025*
