# 🧠 Cartae

**Cartae** est un logiciel de cartographie mentale (mind mapping) open source, cross-platform et performant, avec support des formats standards incluant XMind et FreeMind.

## ✨ Fonctionnalités

### 🎯 MVP (Version actuelle)

- **Canvas interactif** : Zoom, pan, drag & drop, sélection multiple
- **Nœuds intelligents** : Création, édition inline, suppression, re-hiérarchisation
- **Styles flat design** : Thème clair/sombre avec accent color unique
- **Undo/Redo** : Historique illimité avec pattern Command
- **Formats supportés** : Import/Export FreeMind (.mm) et XMind (.xmind)
- **Onglets multi-cartes** : Plusieurs cartes ouvertes simultanément
- **Raccourcis clavier** : Productivité maximale
- **Autosave** : Sauvegarde automatique locale (IndexedDB)
- **i18n** : Support français/anglais

### 🚀 Roadmap

- **Phase 2** : Thèmes avancés, images, stickers, modèles
- **Phase 3** : Support .xmind complet, export PDF, impression
- **Phase 4** : Collaboration temps réel (CRDT), cloud sync

## 🏗️ Architecture

### Monorepo

- **pnpm** workspaces + **Turbo** pour la performance
- **Packages** :
  - `@cartae/core` : Logique métier, modèles, parsers
  - `@cartae/ui` : Composants React réutilisables
  - `@cartae/design` : Design tokens, thèmes Tailwind
  - `apps/web` : Application web (Vite + React)
  - `apps/desktop` : Application desktop (Tauri)

### Stack Technique

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : TailwindCSS + Radix UI + shadcn
- **State** : Zustand + Immer
- **Canvas** : React Flow + ELK.js
- **Desktop** : Tauri (Rust)
- **Tests** : Vitest + Playwright

## 🚀 Installation

### Installation Rapide (Recommandée)

**Option 1: Script automatique**

```bash
# Cloner le repository
git clone https://github.com/guthubrx/cartae.git
cd cartae

# Lancer le setup wizard
./setup.sh full
```

**Option 2: Installation manuelle**

Consultez le **[Guide de Démarrage Complet](./GETTING-STARTED.md)** pour un setup détaillé étape par étape.

### Installation Simple (Frontend seulement)

Si vous voulez juste tester l'application sans PostgreSQL/Vault :

```bash
git clone https://github.com/guthubrx/cartae.git
cd cartae
./setup.sh simple

# Ou manuellement:
pnpm install
pnpm dev
```

Puis ouvrir **http://localhost:5173**

## 📱 Utilisation

### Application Web

```bash
# Développement
pnpm dev

# Build de production
pnpm build

# Preview
pnpm preview
```

### Application Desktop

```bash
# Développement
pnpm dev:desktop

# Build
pnpm build:desktop
```

## ⌨️ Raccourcis Clavier

| Raccourci              | Action                      |
| ---------------------- | --------------------------- |
| `Enter`                | Nouveau nœud sibling        |
| `Tab`                  | Nouveau nœud enfant         |
| `Shift+Tab`            | Remonter dans la hiérarchie |
| `Delete` / `Backspace` | Supprimer la sélection      |
| `F2`                   | Édition inline              |
| `Ctrl/Cmd+Z`           | Annuler                     |
| `Ctrl/Cmd+Y`           | Refaire                     |
| `Ctrl/Cmd+S`           | Sauvegarder                 |
| `Ctrl/Cmd+O`           | Ouvrir fichier              |
| `Ctrl/Cmd+N`           | Nouvelle carte              |

## 🎨 Design System

Cartae utilise un design system flat moderne avec :

- **Palette neutre** : Gris sobres et contrastes optimisés
- **Accent color unique** : Bleu moderne (#3b82f6)
- **Typographie** : Système harmonieux
- **Espacements** : Système 8px
- **Ombres** : Subtiles et cohérentes

## 🧪 Tests

```bash
# Tests unitaires
pnpm test

# Tests E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

## 📦 Builds

### Web

```bash
pnpm build
# Génère dans apps/web/dist/
```

### Desktop

```bash
pnpm build:desktop
# Génère dans apps/desktop/src-tauri/target/release/
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`feat/nom-feature`)
3. Commit avec Conventional Commands
4. Push et créer une Pull Request

### Standards

- **Code** : TypeScript strict, ESLint, Prettier
- **Commits** : Conventional Commits
- **Tests** : Coverage ≥ 80% sur le core
- **Documentation** : Commentaires FR + EN

## 📄 Licence

**AGPL-3.0** - Voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **XMind** pour l'inspiration
- **React Flow** pour le canvas
- **Tauri** pour le desktop
- **TailwindCSS** pour le design
- **Communauté open source**

---

**Cartae** - Cartographie mentale moderne et intuitive 🧠✨
