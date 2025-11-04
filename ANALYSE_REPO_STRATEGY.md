# Cartae - Analyse Stratégie Repo : Core vs Plugin vs Public vs Privé

**Date :** 3 Novembre 2025
**Objectif :** Déterminer la stratégie de repos (public/privé) pour chaque composant selon :
- **Indispensabilité** (core business)
- **Standard marché** (features attendues)
- **Monétisabilité** (potentiel business)

---

## 📊 Tableau d'Analyse Complet

| # | 🎯 Package | Type | ⭐ | 📊 | 💰 | **Repo** | **💵 Plan** | **💳 Prix Unitaire** | Rationale |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| | | | | | | **🌍 CORE** = cartae-core<br>**🔌 PLUGIN** = cartae-plugins<br>**🔒 PRIVATE** = cartae-private | **FREE** = $0<br>**STARTER** = $4/mo<br>**PRO** = $9/mo<br>**BUSINESS** = $24/user/mo<br>**ENTERPRISE** = Custom | *Prix à la carte* (si vendu séparément) | |
| **CORE INFRASTRUCTURE** |||||||||
| 1 | 📦 Core Format | CORE | ✅✅✅ | ✅✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Format de données universel = interopérabilité maximale. Open-source boost adoption par la communauté. Non-différenciant car tous les outils de productivité ont leur format de base. Standard attendu. |
| 2 | ⚡ Event Bus | CORE | ✅✅✅ | ✅✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Pattern event-driven classique, standard industrie. Aucune propriété intellectuelle (IP). Architecture découplée nécessaire pour extensibilité. Équivalent Redux/EventEmitter. |
| 3 | 💾 Storage IndexedDB | CORE | ✅✅ | ✅✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Persistence locale = feature de base attendue. Implémentation standard IndexedDB. Pas de différenciation possible. Tous les concurrents ont du stockage local. |
| 4 | 🔌 Plugin System | CORE | ✅✅✅ | ✅✅ | ✅ | **🌍 CORE** | **FREE** | **—** | Architecture extensible = valeur ajoutée pour développeurs tiers. Boost écosystème communautaire. Model Obsidian/Notion/VSCode. SDK public attire contributeurs. Faible monétisation (marketplace commission). |
| 5 | 🛠️ Plugin SDK | CORE | ✅✅ | ✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | SDK public = marketplace de plugins tiers. Plus de plugins = plus de valeur pour utilisateurs finaux. Model Obsidian : communauté développe 1000+ plugins. API documentée nécessaire. |
| 6 | 🎨 Design System | CORE | ✅ | ✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Design tokens (couleurs, spacing, typography) réutilisables. Aucun secret business. Cohérence UI cross-packages. Shadcn/Radix UI font pareil en open-source. Showcasé qualité design. |
| 7 | 🧩 UI Components | CORE | ✅✅ | ✅✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Composants React basiques (Button, Input, Modal). Shadcn/Radix/HeadlessUI font pareil en open-source. Pas de différenciation. Facilite adoption si développeurs reconnaissent patterns familiers. |
| **CORE BUSINESS** |||||||||
| 8 | 🧠 MindMap Core | CORE | ✅✅✅ | ✅✅ | ✅✅ | **🔒 PRIVATE** | **STARTER** (basique)<br>**PRO** (avancé)<br>**BUSINESS** (collab) | **$4/mo** | **Cœur métier Cartae.** Logique propriétaire canvas/nodes/graph. Algorithmes layout mindmap custom. Différenciation vs concurrents (Miro, Xmind). Peut être SaaS premium (collaboration temps réel, historique illimité). **Prix unitaire : $4/mo** (Miro équivalent $8, on est -50%). |
| 9 | 🔄 Parsers | CORE | ✅✅ | ✅✅✅ | ❌ | **🌍 CORE** | **FREE** | **—** | Import/export formats (.xmind, .mm, .json, .opml) = interopérabilité. Standard attendu par utilisateurs. Boost adoption (migration depuis Xmind/MindNode). Pas de secret, reverse engineering facile. |
| **PLUGINS SYSTÈME** |||||||||
| 10 | 🔐 Plugin Admin | PLUGIN | ✅✅ | ✅✅✅ | ❌ | **🔒 PRIVATE** | **BUSINESS** | **—** | Interface admin (settings, users, permissions) = feature standard mais accès sensible. Code privé évite failles sécurité si exploré publiquement. Gestion utilisateurs entreprise = critique. Inclus dans plan BUSINESS. |
| 11 | 🛒 Marketplace | PLUGIN | ✅ | ✅✅ | ✅✅ | **🔒 PRIVATE** | **FREE** (browse)<br>**+30% commission** | **30% comm.** | Business model monétisation plugins (commission 30%). Logique propriétaire pricing, revenue share, paiements. Discovery algorithm plugins. Obsidian/VSCode ont marketplace mais code privé. |
| **PLUGINS VIZ** |||||||||
| 12 | 📋 Kanban | PLUGIN | ✅ | ✅✅✅ | ✅ | **🔌 PLUGIN** | **FREE** | **—** | Vue Kanban = feature ultra-standard (Notion, Trello, Jira, Linear). Dnd-kit déjà open-source. Aucun secret. Showcase qualité implémentation. Faible monétisation (inclus plan gratuit). |
| 13 | 📊 Table | PLUGIN | ✅ | ✅✅✅ | ✅ | **🔌 PLUGIN** | **FREE** | **—** | Vue table/spreadsheet = ultra-standard (Airtable, Notion, Excel). TanStack Table déjà open-source avec 23k stars. Aucun secret possible. Boost crédibilité si bien implémenté. |
| 14 | 📅 Timeline | PLUGIN | ❌ | ✅✅ | ✅ | **🔌 PLUGIN** | **FREE** | **—** | Vue timeline/Gantt = feature commune (ClickUp, Asana, Monday). Bibliothèques open-source existantes (vis-timeline). Pas de différenciation majeure. Optionnel pour MVP. |
| 15 | 🕸️ Graph Network | PLUGIN | ❌ | ✅ | ✅✅ | **🔌 PLUGIN** | **FREE** (basic)<br>**PRO** (3D avancé) | **—** | Graph viz complexe (force-directed, 3D) = potentiel premium si algorithmes custom. Mais D3.js/Cytoscape déjà open-source. Décision : repo plugins public avec potentiel version premium privée. |
| **CONNECTORS** |||||||||
| 16 | 📧 Office365 ⚠️ | CONNECTOR | ✅✅ | ✅✅ | ✅✅✅ | **🔒 PRIVATE** | **BUSINESS**<br>**ENTERPRISE** | **$12/mo** | **Requis privé (contrainte utilisateur).** Intégration entreprise Microsoft = forte valeur business B2B. Vendu aux entreprises (plan Business/Enterprise). API Microsoft sensible (credentials, OAuth flow). Code privé protège implémentation. **Prix unitaire : $12/mo** (complexité OAuth + rate limits MS). |
| 17 | ✉️ Gmail | CONNECTOR | ✅ | ✅✅ | ✅✅ | **🔒 PRIVATE** | **PRO**<br>**BUSINESS** | **$5/mo** | Intégration email = monétisable (plan Pro/Business). API Gmail sensible (OAuth, scopes permissions). Logique sync propriétaire. Parsing emails intelligent = IP. B2C/B2B revenue. **Prix unitaire : $5/mo** (coût API + dev). |
| 18 | 💬 Slack | CONNECTOR | ✅ | ✅✅ | ✅✅ | **🔒 PRIVATE** | **BUSINESS**<br>**ENTERPRISE** | **$8/mo** | Intégration team chat = forte demande B2B entreprises. Vendu aux équipes (plan Team/Business). API Slack sensible (webhooks, bot tokens). Sync messages bidirectionnel = valeur. **Prix unitaire : $8/mo** (webhooks + bot). |
| 19 | 📝 Notion | CONNECTOR | ❌ | ✅ | ✅✅ | **🔌 PLUGIN** | **FREE** (import)<br>**PRO** (sync bi-dir) | **$3/mo** | Notion API publique et bien documentée. **Décision : open-source** dans `cartae-plugins` pour boost adoption (migration Notion → Cartae). Version basic gratuite, sync avancé premium dans repo privé. Stratégie communauté. **Prix sync avancé : $3/mo**. |
| 20 | ✓ Linear | CONNECTOR | ❌ | ✅ | ✅✅ | **🔌 PLUGIN** | **FREE** (import)<br>**PRO** (sync bi-dir) | **$3/mo** | Linear API publique. **Décision : open-source** dans `cartae-plugins`. Communauté dev apprécierait (contribue à Linear ecosystem). Version basic open-source, intégration B2B avancée peut être premium privée. **Prix sync avancé : $3/mo**. |
| **AI INTELLIGENCE (SESSION 45-49)** |||||||||
| 21 | 🤖 LLM Service | AI CORE | ✅✅✅ | ✅ | ✅✅✅ | **🔒 PRIVATE** | **PRO+** (inclus) | **$3/mo** | **Cœur intelligence AI.** Abstraction multi-providers (OpenAI, Anthropic, local). Différenciation majeure vs concurrents sans AI. Coûts API à gérer (rate limiting, cache, fallback). Logique propriétaire économie tokens. Valeur premium SaaS. **Prix unitaire : $3/mo** (overhead multi-provider + cache). |
| 22 | ⚙️ AI Registry | AI CORE | ✅✅✅ | ✅ | ✅✅ | **🔒 PRIVATE** | **PRO+** (inclus) | **Inclus** | Orchestration AI multi-plugins (parallèle/séquentiel). Agrégation insights propriétaire. Algorithmes priorité/scoring plugins = IP. Peut être open-source si stratégie écosystème AI tiers, mais actuellement privé pour contrôle. Inclus avec LLM Service. |
| 23 | 🔗 Semantic Connections | AI | ✅✅ | ✅ | ✅✅✅ | **🔒 PRIVATE** | **PRO** (100/mo)<br>**BUSINESS** (∞) | **$6/mo** | **Feature ultra-différenciante.** Graph sémantique automatique entre items = valeur premium. Algorithmes TF-IDF/cosine similarity propriétaires. Concurrents (Roam, Obsidian) ont graph manuel uniquement. Monétisable SaaS. **Prix unitaire : $6/mo** (coût $0.20 + valeur killer feature). |
| 24 | ⭐ Priority Scorer | AI | ✅ | ❌ | ✅✅✅ | **🔒 PRIVATE** | **PRO** (50/mo)<br>**BUSINESS** (∞) | **$4/mo** | **Feature premium AI rare.** Scoring intelligent priorité via LLM (0-10 avec reasoning). Productivité massive utilisateurs. Coûts LLM à facturer (tokens). Concurrents n'ont pas ça. Monétisable B2C/B2B. **Prix unitaire : $4/mo** (coût $0.25 + gain productivité). |
| 25 | 😊 Sentiment Analyzer | AI | ✅ | ❌ | ✅✅✅ | **🔒 PRIVATE** | **PRO** (50/mo)<br>**BUSINESS** (∞) | **$4/mo** | **Feature premium AI rare.** Analyse sentiment/ton émotionnel (frustration, toxicité, urgence). Insights RH/support client = valeur B2B. Coûts LLM à facturer. Use case : manager détecte moral équipe. **Prix unitaire : $4/mo** (coût $0.25 + insights RH). |
| 26 | 🔍 Semantic Search | AI | ✅✅ | ✅ | ✅✅✅ | **🔒 PRIVATE** | **PRO** (1000/mo)<br>**BUSINESS** (∞) | **$8/mo** | **Killer feature AI.** Recherche sémantique via embeddings (vector store ChromaDB/Pinecone). Concurrents ont recherche keyword uniquement. Vector store = coûts infra. Premium SaaS. **Prix unitaire : $8/mo** (coût $0.60 + vector store infra). |
| 27 | 💡 Smart Recommendations | AI | ✅ | ❌ | ✅✅✅ | **🔒 PRIVATE** | **PRO** (inclus)<br>**BUSINESS** (avancé) | **$4/mo** | Recommandations AI basées contexte (suggestions liens, items similaires). Productivité utilisateurs. Différenciation vs concurrents. Algorithmes ML propriétaires. Premium SaaS. **Prix unitaire : $4/mo** (coût $0.20 + ML). |
| 28 | 🏷️ Auto-Tagging NLP | AI | ✅ | ✅ | ✅✅ | **🔒 PRIVATE** | **STARTER** (50/mo)<br>**PRO** (200/mo)<br>**BUSINESS** (∞) | **$5/mo** | Auto-tagging NLP via extraction entities/keywords = gain temps massif. Freemium : gratuit limité (50/mois), illimité payant. Notion/Craft ont ça mais basique. Privé pour gérer quotas/coûts LLM. **Prix unitaire : $5/mo** (coût $0.35 + NLP). |
| 29 | 📈 AI Dashboard | AI | ✅ | ❌ | ✅✅✅ | **🔒 PRIVATE** | **BUSINESS**<br>**ENTERPRISE** | **$10/mo** | Dashboard analytics AI (insights qualité, métriques suggestions, trends). Tableau de bord premium = forte valeur B2B entreprises. Visualisation ROI AI. Concurrents n'ont pas ça. Plan Business/Enterprise. **Prix unitaire : $10/mo** (analytics premium B2B). |
| **APPS** |||||||||
| 30 | 🌐 Web App | APP | ✅✅✅ | ✅✅✅ | ❌ | **🔒 PRIVATE** | **Tous plans** | **Inclus** | Application web complète (React + Vite) = produit fini. Code métier assemblant tous packages. Peut être open-source si stratégie community-driven (Discourse model), mais généralement privé pour SaaS. Routing, auth, UI = code métier. Inclus dans tous les plans. |
| 31 | 💻 Desktop App | APP | ❌ | ✅ | ✅ | **🔒 PRIVATE** | **PRO+** OU<br>**$49 one-time** | **$49 one-time** | App desktop Electron = distribution offline pour utilisateurs sans connexion. Peut être payante (license unique $49). Code app privé = standard industrie (Notion, Obsidian desktop sont privés). Optionnel pour MVP web-first. **Prix one-time : $49** OU inclus PRO+. |
| 32 | 🔐 API Backend | APP | ✅✅ | ✅✅✅ | ❌ | **🔒 PRIVATE** | **Tous plans** | **Inclus** | Backend API (Node.js/Express) = logique métier serveur. Sécurité critique (auth, permissions). Endpoints propriétaires. Sync, collaboration temps réel. **Privé obligatoire** (sécurité). Inclus dans tous les plans. |

**Légende :** 🌍 CORE = cartae-core | 🔌 PLUGIN = cartae-plugins | 🔒 PRIVATE = cartae-private | ⭐📊💰 : ✅✅✅ = Critique/Fort | ✅✅ = Important/Moyen | ✅ = Faible | ❌ = Non

---

## 🚀 Roadmap Fonctionnalités à Développer

### **Vue d'ensemble : Features par Priorité**

Cette section recense **toutes les fonctionnalités** que Cartae doit développer pour être compétitif face aux concurrents (Notion, Obsidian, Roam, Linear, Miro, Slack, MS365, Google Workspace).

**🎨 Note de lecture :** Tableau organisé par catégorie et priorité. Les couleurs indiquent l'urgence :
- 🔴 **P0-Critical** : MVP indispensable (Q4 2025 - Nov-Déc)
- 🟠 **P1-High** : Post-MVP prioritaire (Q1 2026 - Jan-Mar)
- 🟡 **P2-Medium** : Features importantes (Q2 2026 - Avr-Juin)
- 🟢 **P3-Low** : Nice-to-have (Q3 2026+)

**📋 Pour la roadmap détaillée de toutes les 52 fonctionnalités, voir : [`ROADMAP_FEATURES.md`](./ROADMAP_FEATURES.md)**

**Résumé par catégorie :**

| 🏗️ Catégorie | 🔢 Nombre | 🎯 Exemples Clés | ⚡ Priorité |
|---|:---:|---|:---:|
| **🏗️ Core Infrastructure** | 7 | CartaeItem Format, Event Bus, Storage IndexedDB, Plugin System, SDK, File Upload, Quota Management | P0 |
| **🧠 Core Business** | 6 | MindMap, Rich Text Editor, Bidirectional Links, Databases, Design System | P0-P1 |
| **📊 Vues & Visualisations** | 6 | Kanban, Table, Timeline, Calendar, Gallery, Graph 3D | P1-P2 |
| **👥 Collaboration** | 4 | Real-time Collab, Comments, Permissions, Activity Log | P1 |
| **🔗 Connectors** | 7 | Gmail, Slack, Office365, Notion, Linear, GitHub, Trello | P1-P2 |
| **🤖 AI Intelligence** ⭐ | **11** | **LLM Service, Semantic Connections, Semantic Search, Priority Scorer, Sentiment, Recommendations, Auto-Tagging, Dashboard** | **P0-P1** |
| **💻 Apps & Infrastructure** | 5 | Web App, API Backend, Desktop, Mobile, Cloud Sync | P0-P1 |
| **🛡️ Système & Admin** | 7 | Admin Dashboard, Marketplace, Analytics, Notifications, Search, Version History, Soft Delete | P1-P2 |
| **🚀 Avancé & Futur** | 5 | Voice Notes, OCR, Automation, Publish, Themes | P3 |
| **📊 TOTAL** | **52** | **Features identifiées et documentées** | |

**🎯 Killer Differentiation : AI Intelligence (11 features)**

- **Aucun concurrent** n'a un écosystème AI aussi complet intégré nativement
- **Graph sémantique automatique** (Roam/Obsidian = manuel)
- **Semantic Search** (Notion/Obsidian = keyword only)
- **Priority Scorer + Sentiment Analyzer** (unique sur le marché)
- **Fondation extensible** : LLM Service + AI Plugin Registry pour marketplace future



---

### **📊 Résumé Priorités**

| Priorité | Nombre Features | Exemples Clés | Timeline |
|----------|----------------|---------------|----------|
| **P0 - Critical** | 13 | Core format, MindMap, LLM Service, Semantic Connections, Web/API, File Upload, Quota Mgmt | **Q4 2025 (Nov-Déc)** |
| **P1 - High** | 19 | Collaboration, Connectors (Gmail, Slack, O365), AI plugins, Desktop, Version History | **Q1 2026 (Jan-Mar)** |
| **P2 - Medium** | 13 | Timeline, Calendar, GitHub, AI Dashboard, Marketplace, Mobile, Soft Delete | **Q2 2026 (Avr-Juin)** |
| **P3 - Low** | 7 | Gallery, Trello, Voice, OCR, Automation, Publish, Themes | **Q3 2026+** |

**Total Features identifiées : 52**

---

### **🎯 Différenciation vs Concurrents**

| Concurrent | Features Manquantes (Cartae les a) | Impact Compétitif |
|------------|-------------------------------------|-------------------|
| **Notion** | Graph sémantique AI, Priority scorer, Sentiment analyzer, Semantic search (keyword only) | ✅ **Killer AI différenciation** |
| **Obsidian** | Collaboration temps réel, Connectors B2B, AI complet (0 AI actuellement) | ✅ **Cloud + AI vs local-only** |
| **Roam Research** | AI Intelligence (graph manuel), Connectors, Vues multiples (Kanban, Table) | ✅ **AI automation + flexibility** |
| **Linear** | Knowledge management, MindMap, Graph sémantique, AI avancé (basic only) | ✅ **All-in-one vs project-only** |
| **Miro** | Knowledge mgmt, AI, Connectors, Structured data (whiteboard only) | ✅ **All-in-one vs visual-only** |
| **Slack** | Knowledge mgmt, MindMap, AI Intelligence, Structured data (chat only) | ✅ **All-in-one vs chat-only** |

**Cartae Unique Value Proposition :**
- **Seul outil** avec MindMap + Knowledge + AI Intelligence + Connectors B2B dans un seul produit
- **9 AI features** (vs 0-3 chez concurrents)
- **Graph sémantique automatique** (Roam/Obsidian = manuel)
- **All-in-one** : remplace Notion + Miro + Slack + Linear + Roam

---

## 📈 Synthèse par Repo (Architecture 3 Repos)

### 🌍 **REPO 1 : cartae-core (Public)**

**Total : 7 composants** | **Licence :** MIT/Apache-2.0

| Composant | Raison Principale |
|-----------|-------------------|
| `@cartae/core` | Format CartaeItem, Event Bus, Storage = foundation standard |
| `@cartae/plugin-system` | Registry, loader, sandbox = écosystème plugins |
| `@cartae/plugin-sdk` | SDK développeurs = marketplace tiers |
| `@cartae/design` | Design tokens = cohérence UI |
| `@cartae/ui` | Composants React basiques = adoption |
| `@cartae/parsers` | Import/export .xmind/.mm = interopérabilité |

**Objectifs :**
- 🎯 **Foundation solide** non-différenciante
- 🤝 **Adoption développeurs** via SDK public
- 📈 **SEO/Marketing** (GitHub stars)
- 🔧 **Interopérabilité** standards ouverts

**Business model :**
- Gratuit (open-source)
- Revenue indirect : adoption → SaaS conversions

---

### 🔌 **REPO 2 : cartae-plugins (Public)**

**Total : 6 composants** | **Licence :** MIT

| Composant | Raison Principale |
|-----------|-------------------|
| `kanban-plugin` | Vue Kanban showcase qualité (dnd-kit) |
| `table-plugin` | Vue Table showcase (TanStack) |
| `timeline-plugin` | Vue Timeline (futur) |
| `calendar-plugin` | Vue Calendar (futur) |
| `notion-connector` | Connector Notion API (basic, migration) |
| `linear-connector` | Connector Linear API (basic, communauté) |

**Objectifs :**
- 🔌 **Extensibilité** communautaire
- 🎨 **Showcase** implémentations référence
- 🤝 **Contributions** pull requests bienvenues
- 📦 **Distribution** npm packages `@cartae/viz-*`

**Plugins communautaires attendus :**
- Intégrations tierces (Trello, Asana, GitHub)
- Vues custom (Graph 3D, Mind Map alt)
- Exporteurs (PDF, Markdown, HTML)

**Business model :**
- Gratuit (open-source)
- Revenue indirect : crédibilité → adoption entreprise

---

### 🔒 **REPO 3 : cartae-private (Privé)**

**Total : 19 composants** | **Licence :** Propriétaire

#### **Catégorie 1 : Core Business** (3 composants)
- `@cartae/mindmap-core` - Cœur métier, algorithmes layout
- `apps/web` - App complète (React + Vite)
- `apps/api` - Backend API (auth, sync, collab)

#### **Catégorie 2 : Plugins Système** (2 composants)
- `plugin-admin` - Admin sensible (users, permissions)
- `plugin-marketplace` - Monétisation (pricing, revenue share)

#### **Catégorie 3 : Data Connectors B2B** (3 composants)
- **Office365 Connector** ⚠️ (requis privé)
- Gmail Connector (API sensible)
- Slack Connector (B2B entreprise)

#### **Catégorie 4 : AI Intelligence** (10 composants - Session 45-49)
- `llm-service` - Cœur AI, abstraction providers
- `ai-plugin-registry` - Orchestration AI
- `semantic-connections` - Graph sémantique auto
- `priority-scorer` - Scoring LLM
- `sentiment-analyzer` - Analyse sentiment
- `semantic-search` - Embeddings (Session 46)
- `smart-recommendations` - Recommandations (Session 47)
- `auto-tagging` - NLP (Session 48)
- `ai-dashboard` - Analytics (Session 49)

#### **Catégorie 5 : Apps Desktop** (1 composant)
- `apps/desktop` - Electron app (optionnel MVP)

**Objectifs :**
- 🔒 **Protéger IP** algorithmes propriétaires
- 💰 **Monétisation** features premium SaaS
- 🏢 **B2B Enterprise** intégrations sensibles
- 🤖 **AI Intelligence** différenciation majeure
- 🔐 **Sécurité** code critique

**Business model :**
- 💵 **SaaS** : Free / Pro ($9/mo) / Business ($29/user) / Enterprise
- 💵 **Marketplace** : Commission 30%
- 💵 **Connectors B2B** : Office365/Slack/Gmail premium
- 💵 **AI Features** : Coûts LLM facturés
- 💵 **Enterprise** : On-premise, SLA, support

---

### 📊 **Comparatif 3 Repos**

| Critère | 🌍 cartae-core | 🔌 cartae-plugins | 🔒 cartae-private |
|---------|---------------|------------------|-------------------|
| **Composants** | 7 | 6 | 19 |
| **Licence** | MIT/Apache-2.0 | MIT | Propriétaire |
| **Visibilité** | Public | Public | Privé équipe |
| **Contributions** | ✅ Bienvenues | ✅ Bienvenues | ❌ Équipe only |
| **Revenue** | Indirect | Indirect | Direct (SaaS) |
| **Objectif** | Adoption | Communauté | Monétisation |
| **Stars GitHub** | 🎯 Target | 🎯 Target | N/A |
| **Différenciation** | ❌ Standard | ❌ Standard | ✅ Forte (AI, MindMap) |
| **Business Value** | Faible | Faible | **Fort** |

---

## 🎯 Stratégie Recommandée : Architecture 3 Repos

### **📊 Vue d'ensemble**

```
┌─────────────────────────────────────────────────────────┐
│                    CARTAE ECOSYSTEM                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🌍 cartae-core (PUBLIC)     → Foundation & Standards   │
│  🔌 cartae-plugins (PUBLIC)  → Community Plugins        │
│  🔒 cartae-private (PRIVÉ)   → Business & Premium       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### **Repo 1 : `cartae-core` (Public) 🌍**

**URL :** `https://github.com/guthubrx/cartae-core`
**Licence :** MIT ou Apache-2.0 (plus permissive qu'AGPL pour adoption entreprise)
**Tagline :** *"The extensible foundation for knowledge management"*

**Contenu :**

```
cartae-core/                                 # PUBLIC 🌍
├── packages/
│   ├── core/                               # Format CartaeItem, Event Bus, Storage
│   ├── plugin-system/                      # Registry, loader, sandbox
│   ├── plugin-sdk/                         # API développeurs, types, hooks
│   ├── design/                             # Design tokens (couleurs, spacing)
│   ├── ui/                                 # Composants React basiques
│   └── parsers/                            # Import/export .xmind, .mm, .json
│
├── examples/
│   ├── minimal-app/                        # Exemple app minimaliste
│   └── custom-plugin/                      # Template plugin custom
│
├── docs/
│   ├── getting-started.md
│   ├── plugin-development.md
│   └── api-reference.md
│
└── README.md                               # "Build on Cartae" pitch
```

**Objectifs :**
- 🎯 **Foundation solide** : Core business logic non-différenciant
- 🤝 **Adoption développeurs** : SDK public = écosystème plugins tiers
- 📈 **SEO/Marketing** : GitHub stars, "Built with Cartae" badges
- 🔧 **Interopérabilité** : Standards ouverts (formats, API)
- 💼 **Crédibilité entreprise** : Licence permissive MIT/Apache-2.0

**Business model :**
- Gratuit (open-source)
- Revenue indirect : boost adoption → SaaS conversions

---

### **Repo 2 : `cartae-plugins` (Public) 🔌**

**URL :** `https://github.com/guthubrx/cartae-plugins`
**Licence :** MIT
**Tagline :** *"Official plugins for Cartae - Community contributions welcome"*

**Contenu :**

```
cartae-plugins/                              # PUBLIC 🔌
├── packages/
│   └── viz-plugins/
│       ├── kanban/                         # Vue Kanban (dnd-kit)
│       ├── table/                          # Vue Table (TanStack)
│       ├── timeline/                       # Vue Timeline (futur)
│       ├── calendar/                       # Vue Calendar (futur)
│       └── gallery/                        # Vue Gallery (futur)
│
├── examples/
│   ├── community-plugin-template/          # Template pour plugins communautaires
│   └── custom-viz-plugin/                  # Exemple vue custom
│
└── README.md                               # Contribution guide, plugin showcase
```

**Objectifs :**
- 🔌 **Extensibilité** : Plugins vues communautaires
- 🎨 **Showcase qualité** : Implémentations référence (Kanban, Table)
- 🤝 **Contributions** : Pull requests communauté bienvenues
- 📦 **Distribution** : npm packages `@cartae/viz-*`
- 🌟 **Portfolio** : Démonstration qualité technique

**Business model :**
- Gratuit (open-source)
- Revenue indirect : crédibilité → adoption entreprise

**Plugins communautaires attendus :**
- Intégrations tierces (Trello, Asana, GitHub Issues)
- Vues custom (Mind Map alternative, Graph 3D)
- Exporteurs (PDF, Markdown, HTML)

---

### **Repo 3 : `cartae-private` (Privé) 🔒**

**URL :** `https://github.com/guthubrx/cartae-private`
**Accès :** Équipe uniquement
**Licence :** Propriétaire (All Rights Reserved)
**Tagline :** *"Cartae premium features & business logic"*

**Contenu :**

```
cartae-private/                              # PRIVÉ 🔒
│
├── packages/
│   │
│   ├── mindmap-core/                       # 🔒 Cœur métier Cartae
│   │   └── (canvas, nodes, graph, layout algorithms)
│   │
│   ├── plugin-admin/                       # 🔒 Admin (settings, users, permissions)
│   ├── plugin-marketplace/                 # 🔒 Marketplace (pricing, revenue share)
│   │
│   ├── llm-service/                        # 🔒 AI Core
│   │   └── (abstraction, rate limiting, cache, providers)
│   │
│   └── ai-plugins/                         # 🔒 AI Intelligence
│       ├── registry/                       # Orchestration AI
│       ├── semantic-connections/           # Graph sémantique auto
│       ├── priority-scorer/                # Scoring LLM
│       ├── sentiment-analyzer/             # Analyse sentiment
│       ├── semantic-search/                # Recherche embeddings (Session 46)
│       ├── smart-recommendations/          # Recommandations AI (Session 47)
│       ├── auto-tagging/                   # Auto-tagging NLP (Session 48)
│       └── ai-dashboard/                   # Analytics AI (Session 49)
│
├── connectors/                             # 🔒 Data Connectors B2B
│   ├── office365-connector/                # Office365 (requis privé)
│   ├── gmail-connector/                    # Gmail (Session 41-42)
│   ├── slack-connector/                    # Slack (Session 43-44)
│   ├── notion-connector/                   # Notion (futur)
│   └── linear-connector/                   # Linear (futur)
│
└── apps/                                   # 🔒 Applications complètes
    ├── web/                                # App web (React + Vite)
    ├── desktop/                            # App desktop (Electron)
    └── api/                                # Backend API (Node.js)
```

**Objectifs :**
- 🔒 **Protéger IP** : Algorithmes propriétaires, logique business
- 💰 **Monétisation** : Features premium SaaS
- 🏢 **B2B Enterprise** : Intégrations sensibles (Office365, Slack)
- 🤖 **AI Intelligence** : Différenciation vs concurrents
- 🔐 **Sécurité** : Code critique (auth, admin, API)

**Business model :**
- 💵 **SaaS subscriptions** : Free / Pro ($9/mo) / Business ($29/user/mo) / Enterprise (custom)
- 💵 **Marketplace commission** : 30% sur plugins payants
- 💵 **Connectors B2B** : Office365/Slack/Gmail = premium
- 💵 **AI Features** : Coûts LLM facturés (tokens)
- 💵 **Enterprise** : On-premise, SLA, support prioritaire

---

## 💵 Offres & Pricing Détaillé

### **📊 Tableau Récapitulatif des Plans**

| Plan | Prix | Cible | Features Principales | Limitations |
|------|------|-------|---------------------|-------------|
| **FREE** | **$0/mo** | Utilisateurs individuels, tests | • Core complet (cartae-core)<br>• Plugins viz (Kanban, Table, Timeline)<br>• Parsers (.xmind, .mm)<br>• Marketplace (browse only)<br>• MindMap basic<br>• Notion/Linear import | • Pas de connectors premium<br>• Pas d'AI<br>• 1 workspace<br>• 100 items max |
| **STARTER** | **$4/mo** | Utilisateurs actifs, petites équipes | • Tout FREE +<br>• MindMap avancé (historique 30j)<br>• Auto-tagging (50 items/mo)<br>• 5 workspaces<br>• 500 items max | • AI limité (quotas bas)<br>• Pas de connectors B2B<br>• Pas de collab temps réel |
| **PRO** | **$9/mo** | Professionnels, freelances | • Tout STARTER +<br>• **AI Intelligence complète** :<br>  - LLM Service (abstraction)<br>  - Semantic Connections (100/mo)<br>  - Priority Scorer (50/mo)<br>  - Sentiment Analyzer (50/mo)<br>  - Semantic Search (1000 queries/mo)<br>  - Smart Recommendations<br>  - Auto-tagging (200/mo)<br>• Gmail connector<br>• Notion/Linear sync bi-dir<br>• Desktop app<br>• Illimité workspaces/items<br>• Historique 1 an | • Pas de collab team<br>• Pas Office365/Slack<br>• Pas AI Dashboard<br>• Pas admin multi-users |
| **BUSINESS** | **$24/user/mo** | Équipes 5-50 personnes | • Tout PRO +<br>• **Collaboration temps réel**<br>• **Connectors B2B** :<br>  - Office365 (Outlook, OneDrive)<br>  - Slack<br>• **AI illimité** (toutes features)<br>• AI Dashboard (analytics)<br>• Admin multi-users<br>• Permissions granulaires<br>• SSO (Google, Microsoft)<br>• Support prioritaire<br>• Historique illimité | • Pas on-premise<br>• Pas SLA garanti<br>• Pas custom integrations |
| **ENTERPRISE** | **Custom** (~$60-100/user) | Entreprises 50+ personnes | • Tout BUSINESS +<br>• **On-premise deployment**<br>• **SLA 99.9%**<br>• **Custom connectors** (SAP, Salesforce, etc.)<br>• **Dedicated instance**<br>• **Advanced security** (SAML, audit logs)<br>• **White-label**<br>• **Custom AI models** (fine-tuning)<br>• Account manager<br>• Training & onboarding<br>• Custom contract | Aucune |

---

### **🎯 Feature Matrix par Plan**

| Feature | FREE | STARTER | PRO | BUSINESS | ENTERPRISE |
|---------|:----:|:-------:|:---:|:--------:|:----------:|
| **CORE & PLUGINS** ||||||
| Core (formats, events, storage) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plugin SDK (développeurs) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kanban / Table / Timeline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parsers (.xmind, .mm, .json) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Marketplace (browse) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MINDMAP** ||||||
| MindMap basic | ✅ | ✅ | ✅ | ✅ | ✅ |
| MindMap avancé (historique) | ❌ | 30 jours | 1 an | Illimité | Illimité |
| Collaboration temps réel | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AI INTELLIGENCE** ||||||
| LLM Service | ❌ | ❌ | ✅ | ✅ | ✅ |
| Semantic Connections | ❌ | ❌ | 100/mo | Illimité | Illimité |
| Priority Scorer | ❌ | ❌ | 50/mo | Illimité | Illimité |
| Sentiment Analyzer | ❌ | ❌ | 50/mo | Illimité | Illimité |
| Semantic Search | ❌ | ❌ | 1000/mo | Illimité | Illimité |
| Smart Recommendations | ❌ | ❌ | ✅ | ✅ (avancé) | ✅ (custom) |
| Auto-Tagging NLP | ❌ | 50/mo | 200/mo | Illimité | Illimité |
| AI Dashboard | ❌ | ❌ | ❌ | ✅ | ✅ |
| **CONNECTORS** ||||||
| Notion import | ✅ | ✅ | ✅ | ✅ | ✅ |
| Linear import | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notion/Linear sync bi-dir | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gmail | ❌ | ❌ | ✅ | ✅ | ✅ |
| Office365 | ❌ | ❌ | ❌ | ✅ | ✅ |
| Slack | ❌ | ❌ | ❌ | ✅ | ✅ |
| Custom connectors (SAP, etc.) | ❌ | ❌ | ❌ | ❌ | ✅ |
| **APPS & INFRA** ||||||
| Web App | ✅ | ✅ | ✅ | ✅ | ✅ |
| Desktop App | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mobile App (futur) | ❌ | ❌ | ✅ | ✅ | ✅ |
| API Backend | ✅ | ✅ | ✅ | ✅ | ✅ |
| On-premise deployment | ❌ | ❌ | ❌ | ❌ | ✅ |
| **LIMITES** ||||||
| Workspaces | 1 | 5 | Illimité | Illimité | Illimité |
| Items | 100 | 500 | Illimité | Illimité | Illimité |
| Users | 1 | 1 | 1 | Team | Team |
| Storage | 100 MB | 1 GB | 10 GB | 100 GB/user | Illimité |
| **SUPPORT** ||||||
| Community (Discord) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email support | ❌ | ❌ | 48h | 24h | 4h SLA |
| Priority support | ❌ | ❌ | ❌ | ✅ | ✅ |
| Dedicated account manager | ❌ | ❌ | ❌ | ❌ | ✅ |
| Training & onboarding | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### **💳 Prix Unitaires vs Bundles : L'Économie des Plans**

**Concept :** Si chaque feature était vendue séparément (à la carte), combien coûterait-elle ?

#### **Grille Prix Unitaires (À la Carte)**

| Feature | Coût Réel | Prix Unitaire | Rationale |
|---------|-----------|---------------|-----------|
| **🧠 MindMap Pro** | $0.10/mo | **$4/mo** | Algorithmes layout propriétaires, historique 1 an. Miro équivalent $8, on est -50%. |
| **✉️ Gmail Connector** | $0.10/mo | **$5/mo** | OAuth + sync bidirectionnel + parsing intelligent. Coût API + dev/maintenance. |
| **💬 Slack Connector** | $0.15/mo | **$8/mo** | Webhooks + bot + sync messages. Complexité API Slack. |
| **📧 Office365 Connector** | $0.20/mo | **$12/mo** | Complexité OAuth Microsoft + rate limits stricts + multi-services (Outlook, OneDrive). |
| **📝 Notion Sync avancé** | $0.05/mo | **$3/mo** | API publique simple, sync bidirectionnel avancé. |
| **✓ Linear Sync avancé** | $0.05/mo | **$3/mo** | API publique simple, sync bidirectionnel avancé. |
| **🤖 LLM Service** | $0.50/mo | **$3/mo** | Abstraction multi-providers + cache LRU + rate limiting. Overhead infrastructure. |
| **🔗 Semantic Connections** | $0.20/mo | **$6/mo** | Coût LLM $0.20 + killer feature (graph automatique TF-IDF). Valeur premium. |
| **⭐ Priority Scorer** | $0.25/mo | **$4/mo** | Coût LLM $0.25 + gain productivité (scoring intelligent 0-10). |
| **😊 Sentiment Analyzer** | $0.25/mo | **$4/mo** | Coût LLM $0.25 + insights RH (détection moral équipe, toxicité). |
| **🔍 Semantic Search** | $0.60/mo | **$8/mo** | Coût LLM $0.60 + vector store infra (ChromaDB/Pinecone). Coûts embedding. |
| **💡 Smart Recommendations** | $0.20/mo | **$4/mo** | Coût LLM $0.20 + algorithmes ML propriétaires. Suggestions contextuelles. |
| **🏷️ Auto-Tagging NLP** | $0.35/mo | **$5/mo** | Coût LLM $0.35 + extraction entities/keywords NLP. Gain temps massif. |
| **📈 AI Dashboard** | $0.50/mo | **$10/mo** | Analytics premium B2B (insights qualité, métriques, trends). Visualisation ROI AI. |

**Total à la carte :** **$73/mo** (tous features)

---

#### **🎁 Économie Bundle Plans**

| Plan | Features Incluses (valeur à la carte) | Prix Bundle | Économie |
|------|----------------------------------------|-------------|----------|
| **STARTER** | MindMap Pro ($4) + Auto-tagging limité ($2.5) | **$4/mo** | **$2.5 économisés (38%)** |
| **PRO** | STARTER + 7 AI features ($44) + Gmail ($5) + Notion/Linear ($6) + Desktop ($3) | **$9/mo** | **$55 économisés (86%)** |
| **BUSINESS** | PRO + Office365 ($12) + Slack ($8) + AI illimité ($10) + AI Dashboard ($10) | **$24/user** | **$49 économisés (67%)** |

**Stratégie :**
- **Bundle PRO @$9** = Valeur $64 → **86% discount** 🎯
  - Justification : Adoption massive B2C, lifetime value > à la carte, lock-in écosystème AI
  - Marge brute : $5.50/user (61%) après coûts LLM/infra

- **Bundle BUSINESS @$24** = Valeur $73 → **67% discount** 🎯
  - Justification : Pricing B2B compétitif (MS365 $22, Google $22), AI justifie +$2
  - Marge brute : $16.50/user (69%) après coûts LLM/infra/connectors

**Insight :** Les bundles sont **extrêmement avantageux** pour l'utilisateur (économie 67-86%), ce qui justifie l'adoption massive et compense par le volume (1000+ users PRO, 500+ teams BUSINESS).

---

### **💰 Revenue Streams**

| Source | Contribution | Stratégie |
|--------|-------------|-----------|
| **SaaS Subscriptions** | 60-70% | Revenue principal, ARR prévisible |
| **Marketplace (30% commission)** | 15-20% | Écosystème plugins tiers, croissance exponentielle |
| **Desktop App (one-time $49)** | 5-10% | Revenue ponctuel, niche utilisateurs offline |
| **Enterprise Custom** | 10-15% | Deals gros comptes, marges élevées |

**ARR Target (Annual Recurring Revenue) :**

| Metric | Year 1 (2026) | Year 2 (2027) | Year 3 (2028) |
|--------|--------|--------|--------|
| **FREE users** | 5,000 | 25,000 | 100,000 |
| **STARTER users** | 500 ($2k/mo) | 2,500 ($10k/mo) | 10,000 ($40k/mo) |
| **PRO users** | 1,000 ($9k/mo) | 5,000 ($45k/mo) | 20,000 ($180k/mo) |
| **BUSINESS teams** (10 users/team) | 50 teams = 500 users ($12k/mo) | 200 teams = 2k users ($48k/mo) | 1000 teams = 10k users ($240k/mo) |
| **ENTERPRISE teams** (50 users/team) | 2 deals = 100 users ($6k/mo) | 10 deals = 500 users ($40k/mo) | 50 deals = 2.5k users ($200k/mo) |
| **Marketplace commission** (30%) | $1k/mo | $8k/mo | $40k/mo |
| **Desktop one-time** ($49) | $10k/year | $50k/year | $200k/year |
| **TOTAL MRR** | **$30k/mo** | **$151k/mo** | **$700k/mo** |
| **TOTAL ARR** | **$360k** | **$1.81M** | **$8.4M** |

**Détails calculs :**
- **Year 1 (2026)** : $2k + $9k + $12k + $6k + $1k = **$30k MRR** × 12 + $10k one-time = **$370k ARR**
- **Year 2 (2027)** : $10k + $45k + $48k + $40k + $8k = **$151k MRR** × 12 + $50k one-time = **$1.86M ARR**
- **Year 3 (2028)** : $40k + $180k + $240k + $200k + $40k = **$700k MRR** × 12 + $200k one-time = **$8.6M ARR**

**Impact BUSINESS @$24 vs @$29 :**
- Year 1 : -17% revenue/user BUT +30% conversion = **Net +8% ARR total** ✅
- Prix psychologique $24 = sweet spot marché (MS365 $22, Google $22)

---

### **🎯 Positionnement Prix vs Concurrents (2025)**

#### **B2C Individual Plans**

<table>
<tr>
<th>Concurrent</th>
<th>Plan</th>
<th>Prix</th>
<th>Offre Incluse</th>
<th>Cartae Équivalent</th>
<th>Delta</th>
<th>Différenciation</th>
</tr>
<tr>
<td><strong>Obsidian</strong><br><em>(Note-taking local)</em></td>
<td>Sync</td>
<td>$4-10/mo</td>
<td>• Sync notes cross-device<br>• Encryption E2E<br>• Pas de limite items<br>• App gratuite (local)</td>
<td><strong>STARTER</strong> $4/mo</td>
<td><strong>0% à -60%</strong></td>
<td>✅ <strong>Cartae = Obsidian + AI</strong><br>• Auto-tagging NLP (50/mo)<br>• MindMap (historique 30j)<br>• Pas d'AI chez Obsidian</td>
</tr>
<tr>
<td><strong>Notion</strong><br><em>(Workspace all-in-one)</em></td>
<td>Plus</td>
<td>$10/mo</td>
<td>• Unlimited blocks<br>• Unlimited file uploads<br>• 30-day history<br>• AI add-on $8/mo extra</td>
<td><strong>PRO</strong> $9/mo</td>
<td><strong>-10%</strong></td>
<td>✅ <strong>Cartae = Notion AI inclus</strong><br>• Notion AI = +$8 séparé<br>• Cartae : AI inclus (7 features)<br>• Graph sémantique auto (Notion manuel)</td>
</tr>
<tr>
<td><strong>Roam Research</strong><br><em>(Networked thought)</em></td>
<td>Pro</td>
<td>$13.75/mo</td>
<td>• Unlimited graphs<br>• Graph database<br>• Backlinks auto<br>• Collaboration limité</td>
<td><strong>PRO</strong> $9/mo</td>
<td><strong>-35%</strong></td>
<td>✅ <strong>Cartae = Roam + AI</strong><br>• Graph sémantique AI (vs manuel)<br>• Priority scoring<br>• Sentiment analysis<br>• Semantic search</td>
</tr>
<tr>
<td><strong>Obsidian</strong><br><em>(Note-taking local)</em></td>
<td>Sync + Publish</td>
<td>$18-30/mo</td>
<td>• Sync ($10/mo)<br>• Publish site web ($8-20/mo)<br>• Custom domain<br>• No AI</td>
<td><strong>PRO</strong> $9/mo</td>
<td><strong>-50% à -70%</strong></td>
<td>✅ <strong>Cartae = bundle complet</strong><br>• AI + connectors inclus<br>• Desktop app inclus<br>• Gmail sync<br>• Obsidian : features à la carte</td>
</tr>
</table>

**Positionnement B2C :** Cartae PRO @$9 = **ultra-compétitif** vs marché ($8-15), AI Intelligence incluse = différenciation majeure (concurrents facturent AI séparément ou n'en ont pas).

---

#### **B2B Team Plans**

<table>
<tr>
<th>Concurrent</th>
<th>Plan</th>
<th>Prix/user</th>
<th>Offre Incluse</th>
<th>Cartae Équivalent</th>
<th>Delta</th>
<th>Différenciation</th>
</tr>
<tr>
<td><strong>Slack</strong><br><em>(Team chat)</em></td>
<td>Pro</td>
<td>$7.25/user</td>
<td>• Unlimited message history<br>• 10+ app integrations<br>• Workflow automation<br>• Screen sharing<br>• Pas de knowledge mgmt</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+231%</strong></td>
<td>⚠️ <strong>Cartae = Slack + Knowledge + AI</strong><br>• Slack = chat only<br>• Cartae = all-in-one (MindMap + docs + chat + AI)<br>• Slack AI = +$10/user extra</td>
</tr>
<tr>
<td><strong>Miro</strong><br><em>(Visual whiteboard)</em></td>
<td>Starter</td>
<td>$8/user</td>
<td>• Infinite canvas<br>• Collaboration temps réel<br>• 3 boards editables<br>• Templates<br>• Pas d'AI ni knowledge</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+200%</strong></td>
<td>⚠️ <strong>Cartae = Miro + Knowledge + AI</strong><br>• Miro = whiteboard only<br>• Cartae = MindMap + docs + connectors + AI<br>• Scope plus large</td>
</tr>
<tr>
<td><strong>Linear</strong><br><em>(Project mgmt)</em></td>
<td>Basic</td>
<td>$16/user</td>
<td>• Issues unlimited<br>• Roadmaps<br>• Triage Intelligence<br>• Integrations<br>• AI basic inclus</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+50%</strong></td>
<td>✅ <strong>Cartae = Linear + Knowledge</strong><br>• Linear = tasks/projects<br>• Cartae = knowledge + MindMap + AI avancé<br>• Graph sémantique (Linear n'a pas)</td>
</tr>
<tr>
<td><strong>Notion</strong><br><em>(Workspace)</em></td>
<td>Business</td>
<td>$20/user</td>
<td>• Unlimited pages/blocks<br>• 90-day history<br>• SAML SSO<br>• Advanced permissions<br>• AI inclus basique</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+20%</strong></td>
<td>✅ <strong>Cartae = Notion + AI avancé</strong><br>• Notion AI = basique<br>• Cartae : 9 AI features (vs 3 Notion)<br>• Graph sémantique auto<br>• Office365/Slack connectors</td>
</tr>
<tr>
<td><strong>MS 365</strong><br><em>(Email + Office)</em></td>
<td>Premium</td>
<td>$22/user</td>
<td>• Outlook + OneDrive<br>• Word/Excel/PowerPoint<br>• Teams<br>• 1TB storage<br>• Security avancée</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+9%</strong></td>
<td>✅ <strong>Cartae = MS365 + AI Knowledge</strong><br>• MS365 = email + office apps<br>• Cartae = knowledge mgmt + AI<br>• MindMap + semantic graph<br>• Complémentaire (pas concurrent)</td>
</tr>
<tr>
<td><strong>Google Workspace</strong><br><em>(Email + Docs)</em></td>
<td>Plus</td>
<td>$22/user</td>
<td>• Gmail + Drive<br>• Docs/Sheets/Slides<br>• Meet<br>• 5TB pooled storage<br>• AI Gemini inclus</td>
<td><strong>BUSINESS</strong> $24/user</td>
<td><strong>+9%</strong></td>
<td>✅ <strong>Cartae = Workspace + AI Knowledge</strong><br>• Workspace = email + docs collab<br>• Cartae = knowledge mgmt + AI avancé<br>• MindMap + semantic graph<br>• Complémentaire (pas concurrent)</td>
</tr>
</table>

**Positionnement B2B :** Cartae BUSINESS @$24 = **premium justifié** car :
1. **vs Slack/Miro** (+200-230%) : Scope beaucoup plus large (all-in-one knowledge + chat + visual + AI)
2. **vs Linear** (+50%) : Knowledge management + MindMap + AI avancé = valeur ajoutée
3. **vs Notion** (+20%) : AI Intelligence supérieure (9 features vs 3) justifie +$4
4. **vs MS365/Google** (+9%) : Comparable, **complémentaire** (knowledge mgmt vs email/office), AI différenciation

---

#### **Stratégie Pricing Globale**

✅ **STARTER $4** : Entry-level identique Obsidian ($4), mais avec AI auto-tagging
✅ **PRO $9** : Sweet spot B2C (entre Obsidian $8 et Notion $10), AI = killer différenciation
✅ **BUSINESS $24** : Premium B2B (entre Notion $20 et MS365/Google $22), AI illimité justifie +$2-4
✅ **Valeur perçue** : AI Intelligence différenciation majeure vs TOUS concurrents (aucun n'a graph sémantique auto, priority scorer, sentiment analyzer)

---

## 💡 Cas Particuliers & Décisions

### **🤔 Cas 1 : AI Plugin Registry**

**Option A - Privé** (recommandé) :
- ✅ Orchestration propriétaire = IP
- ✅ Agrégation insights = valeur
- ✅ Contrôle roadmap AI

**Option B - Public** :
- ✅ Boost écosystème plugins AI tiers
- ✅ Communauté développe plugins AI custom
- ❌ Concurrent peut copier orchestration

**Décision :** **PRIVÉ** (valeur business > écosystème pour l'instant)

---

### **🤔 Cas 2 : Notion/Linear Connectors**

**Critères décision :**
- APIs publiques (moins sensible qu'Office365)
- Communauté dev apprécierait open-source
- Mais monétisable B2B (intégrations entreprise)

**Recommandation :** **PRIVÉ initialement**, puis **open-source si stratégie freemium**
- Gratuit : Connexion basique
- Premium : Sync bi-directionnel, webhooks, advanced features

---

### **🤔 Cas 3 : Auto-Tagging NLP**

**Potentiel Freemium :**
- **Free tier :** 100 items/mois auto-tagged
- **Pro tier :** Illimité + règles custom

**Recommandation :** **PRIVÉ** avec stratégie freemium future

---

## 📊 Matrice Décision Rapide

| Critère | Public | Privé |
|---------|--------|-------|
| **Indispensable Core** | ❌ | ✅ |
| **Standard Marché (tous font)** | ✅ | ❌ |
| **Différenciation vs Concurrents** | ❌ | ✅ |
| **Monétisable B2B** | ❌ | ✅ |
| **Coûts Infra/API** | ❌ | ✅ |
| **Boost Adoption/Écosystème** | ✅ | ❌ |
| **Interopérabilité** | ✅ | ❌ |
| **Sécurité Sensible** | ❌ | ✅ |

---

## 🚀 Plan d'Action Recommandé

### **Étape 1 : Créer Repo Privé**

```bash
# Sur GitHub
# Créer nouveau repo : guthubrx/cartae-private
# Visibilité : Private
# Licence : Propriétaire (All Rights Reserved)
```

### **Étape 2 : Séparer Composants (Session 45 actuelle)**

**À GARDER dans cartae-session-45-48 (pour push vers PRIVÉ) :**
```
packages/llm-service/                    🔒 PRIVÉ
packages/ai-plugins/registry/            🔒 PRIVÉ
packages/ai-plugins/priority-scorer/     🔒 PRIVÉ
packages/ai-plugins/sentiment-analyzer/  🔒 PRIVÉ
packages/ai-plugins/semantic-connections/ 🔒 PRIVÉ
```

**À DÉPLACER vers repo PUBLIC (futur) :**
```
packages/core/                          🌍 PUBLIC
packages/plugin-system/                 🌍 PUBLIC
packages/plugin-sdk/                    🌍 PUBLIC
packages/design/                        🌍 PUBLIC
packages/ui/                            🌍 PUBLIC
packages/parsers/                       🌍 PUBLIC
packages/viz-plugins/kanban/            🌍 PUBLIC
packages/viz-plugins/table/             🌍 PUBLIC
```

### **Étape 3 : Session 45 - Push vers PRIVÉ**

```bash
# Commiter Session 45 (AI plugins)
git add packages/llm-service packages/ai-plugins SESSION_45_README.md pnpm-lock.yaml

git commit -m "feat(ai-intelligence): session 45 - AI Plugin Architecture (PRIVATE)

🔒 Private packages (~2,260 LOC):
- @cartae/llm-service - LLM abstraction
- @cartae/ai-plugin-registry - Registry AI
- @cartae/priority-scorer-plugin - Scoring LLM
- @cartae/sentiment-analyzer-plugin - Sentiment LLM
- @cartae/semantic-connections-plugin - Graph sémantique

🤖 Generated with Claude Code"

# Ajouter remote privé
git remote add private git@github.com:guthubrx/cartae-private.git

# Push vers privé
git push private session-45-48-ai-intelligence-plugins
```

### **Étape 4 : Nettoyer Repo Public (futur)**

```bash
# Dans cartae/ (public)
# Supprimer composants privés
git rm -r packages/mindmap-core packages/llm-service packages/ai-plugins/* apps/*

# Garder seulement composants publics
# Commit "refactor: separate public/private components"
# Push vers public
```

---

## 💰 Business Model Résumé

### **Open-Source (Public)**
- **Objectif :** Adoption, écosystème, marketing
- **Revenue :** Indirect (SaaS hosting, support, marketplace commission)

### **Propriétaire (Privé)**
- **Objectif :** Monétisation directe
- **Revenue :**
  - 💵 SaaS subscriptions (Free/Pro/Business/Enterprise)
  - 💵 Plugin marketplace (commission 30%)
  - 💵 Intégrations B2B (Office365, Gmail, Slack)
  - 💵 AI features premium (coûts LLM facturés)
  - 💵 Enterprise (on-premise, custom plugins, SLA)

---

## ✅ Conclusion & Recommandation Finale

### **Pour Session 45 (AI Plugins) :**

**🔒 PUSH vers REPO PRIVÉ `cartae-private` (à créer)**

**Raisons :**
1. ✅ Office365 déjà privé → cohérence
2. ✅ AI Intelligence = différenciation majeure
3. ✅ LLM Service = coûts API à gérer
4. ✅ Plugins AI = features premium monétisables
5. ✅ IP propriétaire vs concurrents

### **Pour le Futur :**

**🌍 Extraire composants publics vers `cartae` (public)**
- Core, Plugin System, SDK, Design, UI, Parsers, Viz basiques
- Boost adoption + écosystème

**🔒 Garder privé dans `cartae-private`**
- Apps complètes, Mindmap Core, AI Intelligence, Data Connectors

---

**Ne PAS pusher Session 45 vers repo public actuel.** ✅
**Créer repo privé d'abord.** ✅

---

*Analyse maintenue par : Claude Code*
*Dernière mise à jour : 3 Novembre 2025*
