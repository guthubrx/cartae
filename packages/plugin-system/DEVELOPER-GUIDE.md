# 📘 Cartae Plugin System - Guide Développeur

Guide complet pour développer des plugins pour Cartae/BigMind.

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Structure d'un Plugin](#structure-dun-plugin)
5. [Manifest](#manifest)
6. [API Plugin Context](#api-plugin-context)
7. [Hooks System](#hooks-system)
8. [Commands](#commands)
9. [UI Contributions](#ui-contributions)
10. [Storage & Data](#storage--data)
11. [Permissions](#permissions)
12. [Exemples Pratiques](#exemples-pratiques)
13. [Bonnes Pratiques](#bonnes-pratiques)
14. [Dépannage](#dépannage)

---

## Introduction

Le système de plugins de Cartae permet d'étendre les fonctionnalités de l'application sans modifier le code core. Inspiré de VS Code, Obsidian, Figma et Chrome Extensions, il offre :

- **Isolation** : Chaque plugin s'exécute dans son propre contexte
- **Sécurité** : Système de permissions granulaires
- **Type-Safety** : Support complet TypeScript
- **Lifecycle Management** : Contrôle total du cycle de vie
- **Hot Reload** : Rechargement à chaud en développement

### Cas d'Usage

- 🎨 **Themes & Appearance** : Personnalisation visuelle
- 🏷️ **Organization** : Tags, filtres, taxonomies
- 📊 **Data Import/Export** : Connecteurs externes
- 🤖 **AI & Automation** : Intégrations intelligence artificielle
- 🔧 **Developer Tools** : Outils de développement
- 📦 **Templates & Snippets** : Modèles réutilisables

---

## Architecture

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────┐
│              Application Host                    │
│  ┌──────────────────────────────────────────┐  │
│  │         PluginRegistry                    │  │
│  │  ┌────────────┐  ┌────────────┐          │  │
│  │  │  Plugin A  │  │  Plugin B  │  ...     │  │
│  │  └────────────┘  └────────────┘          │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Hook System                       │  │
│  │  Actions | Filters | Validations         │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │      Permission Manager                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Flux d'Exécution

1. **Registration** : Plugin enregistré dans le registry
2. **Validation** : Manifest validé (schéma JSON)
3. **Permission Check** : Permissions vérifiées
4. **Activation** : `activate()` appelé avec context
5. **Runtime** : Plugin actif, hooks/commands disponibles
6. **Deactivation** : `deactivate()` appelé, cleanup

---

## Quick Start

### 1. Créer un Plugin Minimal

```typescript
// my-plugin/index.ts
import type { IPluginContext, PluginManifest } from '@cartae/plugin-system';

export const manifest: PluginManifest = {
  id: 'com.example.hello',
  name: 'Hello Plugin',
  version: '1.0.0',
  description: 'Mon premier plugin',
  author: {
    name: 'Votre Nom',
    email: 'vous@example.com',
  },
  main: 'index.js',
  category: 'productivity',
  source: 'community',
  pricing: 'free',
  permissions: [],
};

export async function activate(context: IPluginContext): Promise<void> {
  console.log('Hello Plugin activé !');

  // Enregistrer une commande
  context.commands.registerCommand('hello.greet', async (name: string) => {
    context.ui.showNotification(`Bonjour ${name} !`, 'info');
  });
}

export async function deactivate(): Promise<void> {
  console.log('Hello Plugin désactivé');
}
```

### 2. Structure de Fichiers

```
my-plugin/
├── index.ts           # Point d'entrée du plugin
├── manifest.json      # Métadonnées (optionnel si manifest exporté dans index.ts)
├── package.json       # Dépendances npm
└── README.md          # Documentation
```

### 3. Tester le Plugin

```typescript
// Dans votre application
import { registry } from './pluginSystem';
import * as myPlugin from './my-plugin';

// Enregistrer
await registry.register(myPlugin);

// Activer
await registry.activate('com.example.hello');

// Utiliser
await registry.executeCommand('hello.greet', 'Monde');

// Désactiver
await registry.deactivate('com.example.hello');
```

---

## Structure d'un Plugin

### Exports Requis

Un plugin doit exporter :

```typescript
export const manifest: PluginManifest; // Métadonnées
export async function activate(context: IPluginContext): Promise<void>;
export async function deactivate(): Promise<void>;
```

### Plugin Context (IPluginContext)

Le `context` fourni à `activate()` donne accès à toutes les APIs :

```typescript
interface IPluginContext {
  pluginId: string; // ID unique du plugin
  hooks: IHookSystem; // Système de hooks
  commands: ICommandSystem; // Système de commandes
  ui: IUISystem; // Interface utilisateur
  storage: IStorageSystem; // Stockage persistant
  mindmap: IMindMapAPI; // API Mind Map
  events: IEventSystem; // Événements pub/sub
  http?: IHttpClient; // Requêtes HTTP (permission)
  fs?: IFileSystem; // Système fichiers (permission)
  clipboard?: IClipboardAPI; // Presse-papier (permission)
}
```

---

## Manifest

### Champs Requis

```typescript
{
  "id": "com.example.myplugin",        // Unique, format reverse-DNS
  "name": "My Plugin",                  // Nom affiché
  "version": "1.0.0",                   // Semantic versioning
  "description": "Description courte",  // 1 ligne
  "author": {                           // Auteur
    "name": "Your Name",
    "email": "you@example.com"
  },
  "main": "index.js",                   // Point d'entrée
  "category": "productivity",           // Catégorie
  "source": "community",                // core | official | community
  "pricing": "free"                     // free | paid
}
```

### Champs Optionnels

```typescript
{
  "longDescription": "Description détaillée...",
  "icon": "🎨",                         // Emoji
  "logo": "/path/to/logo.svg",          // URL ou chemin
  "color": "#F59E0B",                   // Couleur principale
  "tags": ["theme", "colors"],          // Mots-clés
  "license": "MIT",
  "bigmindVersion": "1.0.0",            // Version minimale
  "featured": true,                     // Mis en avant
  "autoActivate": false,                // Auto-activation
  "tagline": "Slogan court",
  "benefits": [                         // Bénéfices
    "Bénéfice 1",
    "Bénéfice 2"
  ],
  "useCases": [                         // Cas d'usage
    "Cas 1: ...",
    "Cas 2: ..."
  ],
  "features": [                         // Fonctionnalités
    {
      "label": "Feature Name",
      "description": "Description",
      "icon": "🚀"
    }
  ],
  "changelog": [                        // Historique
    {
      "version": "1.0.0",
      "date": "2025-01-28",
      "changes": [
        {
          "type": "added",              // added | fixed | changed | removed
          "description": "Feature X"
        }
      ]
    }
  ],
  "hooks": {                            // Déclaration hooks
    "listens": ["node:created"],
    "emits": ["custom:event"]
  },
  "uiContributions": {                  // Contributions UI
    "commands": ["my.command"],
    "menus": ["Context Menu > Item"],
    "panels": ["my-panel"],
    "settings": true
  },
  "permissions": [                      // Permissions requises
    "mindmap:read",
    "mindmap:write"
  ]
}
```

### Catégories Disponibles

- `theme` : Thèmes et apparence
- `productivity` : Productivité
- `integration` : Intégrations externes
- `ai` : Intelligence artificielle
- `developer` : Outils développeur
- `export` : Import/Export
- `other` : Autre

---

## API Plugin Context

### 1. Hooks (`context.hooks`)

```typescript
// Enregistrer un action hook (observer)
context.hooks.registerAction('node:created', async node => {
  console.log('Nouveau nœud:', node.id);
});

// Enregistrer un filter hook (transformation)
context.hooks.registerFilter('node:title', async (title, node) => {
  return title.toUpperCase(); // Transformer le titre
});

// Enregistrer une validation
context.hooks.registerValidation('node:create', async data => {
  if (!data.title) {
    return { valid: false, error: 'Titre requis' };
  }
  return { valid: true };
});
```

### 2. Commands (`context.commands`)

```typescript
// Enregistrer une commande
context.commands.registerCommand('myPlugin.doSomething', async (arg1, arg2) => {
  // Logique de la commande
  return { success: true };
});

// Exécuter une commande
const result = await context.commands.executeCommand('other.command', 'arg');
```

### 3. UI (`context.ui`)

```typescript
// Notifications
context.ui.showNotification('Message', 'info'); // info | success | warning | error

// Dialogs
const confirmed = await context.ui.showDialog({
  title: 'Confirmation',
  message: 'Êtes-vous sûr ?',
  buttons: ['Oui', 'Non'],
});

// Input
const value = await context.ui.showInput({
  title: 'Entrer une valeur',
  placeholder: 'Votre texte...',
  defaultValue: '',
});

// Enregistrer un item de menu
context.ui.registerMenuItem({
  id: 'my-menu-item',
  label: 'Mon Action',
  icon: '⚡',
  command: 'myPlugin.action',
  position: 'context',
});

// Enregistrer un panneau
context.ui.registerPanel({
  id: 'my-panel',
  title: 'Mon Panneau',
  icon: '📋',
  position: 'left', // left | right | bottom
  component: MyPanelComponent,
});
```

### 4. Storage (`context.storage`)

```typescript
// Sauvegarder des données (scoped au plugin)
await context.storage.set('key', { value: 'data' });

// Récupérer des données
const data = await context.storage.get('key');

// Supprimer
await context.storage.remove('key');

// Tout effacer
await context.storage.clear();

// Lister les clés
const keys = await context.storage.keys();
```

### 5. Mind Map (`context.mindmap`)

```typescript
// Lire la carte active
const mindmap = await context.mindmap.getActiveMindMap();

// Créer un nœud
const nodeId = await context.mindmap.createNode({
  parentId: 'root',
  title: 'Nouveau nœud',
  position: { x: 0, y: 0 },
});

// Mettre à jour un nœud
await context.mindmap.updateNode(nodeId, {
  title: 'Titre modifié',
  style: { backgroundColor: '#FF0000' },
});

// Supprimer un nœud
await context.mindmap.deleteNode(nodeId);

// Sélection
const selection = await context.mindmap.getSelection();
await context.mindmap.setSelection([nodeId]);
```

### 6. Events (`context.events`)

```typescript
// S'abonner à un événement
context.events.on('custom:event', data => {
  console.log('Event reçu:', data);
});

// Émettre un événement
context.events.emit('custom:event', { key: 'value' });

// Se désabonner
const unsubscribe = context.events.on('event', handler);
unsubscribe(); // Cleanup
```

### 7. HTTP (`context.http`) - Requires `network` permission

```typescript
// GET request
const response = await context.http.get('https://api.example.com/data');

// POST request
const result = await context.http.post('https://api.example.com/create', {
  body: { name: 'value' },
  headers: { 'Content-Type': 'application/json' },
});

// PUT, DELETE, etc.
await context.http.put(url, options);
await context.http.delete(url);
```

---

## Hooks System

### Types de Hooks

#### Actions (Observers)

Les actions sont notifiées quand un événement se produit. Elles ne modifient pas les données.

```typescript
context.hooks.registerAction('node:created', async node => {
  // Observer la création
  await logActivity(`Node ${node.id} created`);
});
```

#### Filters (Transformations)

Les filters transforment des données avant qu'elles ne soient utilisées.

```typescript
context.hooks.registerFilter('node:title', async (title, node) => {
  // Transformer le titre
  if (title.startsWith('TODO:')) {
    return `✅ ${title}`;
  }
  return title;
});
```

#### Validations

Les validations vérifient que les données sont valides avant une opération.

```typescript
context.hooks.registerValidation('node:create', async data => {
  if (data.title.length > 100) {
    return {
      valid: false,
      error: 'Le titre ne doit pas dépasser 100 caractères',
    };
  }
  return { valid: true };
});
```

### Hooks Disponibles

#### Mind Map Events

- `mindmap:loaded` - Carte chargée
- `mindmap:saved` - Carte sauvegardée
- `mindmap:closed` - Carte fermée

#### Node Events

- `node:created` - Nœud créé
- `node:updated` - Nœud mis à jour
- `node:deleted` - Nœud supprimé
- `node:selected` - Nœud sélectionné
- `node:title` (filter) - Titre du nœud

#### Tag Events

- `tag:created` - Tag créé
- `tag:applied` - Tag appliqué à un nœud
- `tag:removed` - Tag retiré d'un nœud

#### Theme Events

- `theme:changed` - Thème changé

---

## Commands

### Enregistrer une Commande

```typescript
context.commands.registerCommand('myPlugin.action', async (arg1: string, arg2: number) => {
  // Logique de la commande
  console.log(`Exécution avec ${arg1} et ${arg2}`);
  return { success: true, result: 'OK' };
});
```

### Exécuter une Commande

```typescript
// Depuis un autre plugin ou l'app
const result = await registry.executeCommand('myPlugin.action', 'hello', 42);
```

### Commandes avec Validation

```typescript
context.commands.registerCommand('myPlugin.create', async (data: any) => {
  // Valider les arguments
  if (!data.name) {
    throw new Error('Nom requis');
  }

  // Exécuter
  return createEntity(data);
});
```

---

## UI Contributions

### Menus

```typescript
context.ui.registerMenuItem({
  id: 'export-markdown',
  label: 'Exporter en Markdown',
  icon: '📄',
  command: 'export.markdown',
  position: 'context', // context | toolbar | statusbar
  when: 'nodeSelected', // Condition d'affichage
});
```

### Panneaux

```typescript
// React Component
import React from 'react';

function MyPanel() {
  return (
    <div>
      <h2>Mon Panneau</h2>
      <p>Contenu personnalisé</p>
    </div>
  );
}

// Enregistrement
context.ui.registerPanel({
  id: 'my-panel',
  title: 'Mon Panneau',
  icon: '📋',
  position: 'left',
  component: MyPanel,
});
```

### Settings Page

```typescript
context.ui.registerSettingsPage({
  id: 'myPlugin-settings',
  title: 'Mes Paramètres',
  icon: '⚙️',
  component: SettingsComponent,
});
```

---

## Storage & Data

### Plugin Storage

Chaque plugin a son propre espace de stockage isolé :

```typescript
// Sauvegarder des préférences utilisateur
await context.storage.set('preferences', {
  theme: 'dark',
  autoSave: true,
});

// Récupérer
const prefs = await context.storage.get('preferences');

// Stocker des données complexes
await context.storage.set('cache', {
  timestamp: Date.now(),
  data: largeDataSet,
});
```

### Mind Map Data

Pour stocker des données spécifiques à une carte :

```typescript
// Utiliser les métadonnées du nœud
await context.mindmap.updateNode(nodeId, {
  metadata: {
    [`${context.pluginId}:customField`]: 'value',
  },
});

// Récupérer
const node = await context.mindmap.getNode(nodeId);
const customValue = node.metadata?.[`${context.pluginId}:customField`];
```

---

## Permissions

### Déclarer les Permissions

Dans le manifest :

```json
{
  "permissions": ["mindmap:read", "mindmap:write", "network", "storage"]
}
```

### Permissions Disponibles

#### Core Permissions

- `mindmap:read` - Lire la mind map
- `mindmap:write` - Modifier la mind map
- `storage` - Accès au stockage local

#### Network & External

- `network` - Requêtes HTTP
- `filesystem:read` - Lire des fichiers
- `filesystem:write` - Écrire des fichiers
- `clipboard` - Accès presse-papier

#### UI Permissions

- `ui:menu` - Ajouter des items au menu
- `ui:panel` - Enregistrer des panneaux
- `ui:statusbar` - Modifier la barre de statut
- `ui:notification` - Afficher des notifications

#### Advanced

- `commands` - Enregistrer des commandes
- `settings:read` - Lire les paramètres app
- `settings:write` - Modifier les paramètres app
- `native` - Accès APIs natives (desktop)

### Permission Flow

1. Plugin déclare permissions dans manifest
2. Lors de l'activation, l'utilisateur voit un dialog de consentement
3. Utilisateur accepte ou refuse
4. Plugin activé uniquement si toutes les permissions sont accordées

---

## Exemples Pratiques

### Exemple 1 : Tag Auto-Coloring

```typescript
export const manifest: PluginManifest = {
  id: 'com.example.tag-colors',
  name: 'Tag Auto Colors',
  version: '1.0.0',
  description: 'Applique automatiquement des couleurs aux tags',
  author: { name: 'Dev', email: 'dev@example.com' },
  main: 'index.js',
  category: 'theme',
  source: 'community',
  pricing: 'free',
  permissions: ['mindmap:read', 'mindmap:write'],
};

const TAG_COLORS = {
  important: '#FF0000',
  todo: '#FFA500',
  done: '#00FF00',
};

export async function activate(context: IPluginContext): Promise<void> {
  // Hook sur application de tag
  context.hooks.registerAction('tag:applied', async ({ nodeId, tagName }) => {
    const color = TAG_COLORS[tagName.toLowerCase()];

    if (color) {
      await context.mindmap.updateNode(nodeId, {
        style: { backgroundColor: color },
      });

      context.ui.showNotification(`Couleur ${color} appliquée au nœud`, 'success');
    }
  });
}

export async function deactivate(): Promise<void> {
  // Cleanup automatique des hooks
}
```

### Exemple 2 : Export Markdown

```typescript
export const manifest: PluginManifest = {
  id: 'com.example.markdown-export',
  name: 'Markdown Exporter',
  version: '1.0.0',
  description: 'Exporte la mind map en Markdown',
  author: { name: 'Dev', email: 'dev@example.com' },
  main: 'index.js',
  category: 'export',
  source: 'community',
  pricing: 'free',
  permissions: ['mindmap:read', 'filesystem:write'],
};

export async function activate(context: IPluginContext): Promise<void> {
  // Commande d'export
  context.commands.registerCommand('markdown.export', async () => {
    const mindmap = await context.mindmap.getActiveMindMap();

    if (!mindmap) {
      throw new Error('Aucune carte active');
    }

    const markdown = convertToMarkdown(mindmap);

    // Sauvegarder le fichier
    const filename = `${mindmap.meta.name}.md`;
    await context.fs.writeFile(filename, markdown);

    context.ui.showNotification(`Exporté vers ${filename}`, 'success');
  });

  // Item de menu
  context.ui.registerMenuItem({
    id: 'export-markdown',
    label: 'Exporter en Markdown',
    icon: '📄',
    command: 'markdown.export',
    position: 'toolbar',
  });
}

function convertToMarkdown(mindmap: any): string {
  let md = `# ${mindmap.meta.name}\n\n`;

  function processNode(nodeId: string, level: number = 0) {
    const node = mindmap.nodes[nodeId];
    const indent = '  '.repeat(level);
    md += `${indent}- ${node.title}\n`;

    node.children.forEach((childId: string) => {
      processNode(childId, level + 1);
    });
  }

  processNode(mindmap.rootId);
  return md;
}

export async function deactivate(): Promise<void> {}
```

### Exemple 3 : AI Summary

```typescript
export const manifest: PluginManifest = {
  id: 'com.example.ai-summary',
  name: 'AI Summarizer',
  version: '1.0.0',
  description: 'Génère un résumé AI de la carte',
  author: { name: 'Dev', email: 'dev@example.com' },
  main: 'index.js',
  category: 'ai',
  source: 'community',
  pricing: 'paid',
  permissions: ['mindmap:read', 'network'],
};

export async function activate(context: IPluginContext): Promise<void> {
  context.commands.registerCommand('ai.summarize', async () => {
    const mindmap = await context.mindmap.getActiveMindMap();

    if (!mindmap) {
      throw new Error('Aucune carte active');
    }

    // Collecter tous les titres
    const titles = Object.values(mindmap.nodes).map((n: any) => n.title);

    // Appeler API AI
    const response = await context.http.post('https://api.openai.com/v1/completions', {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'gpt-3.5-turbo',
        prompt: `Résume cette mind map:\n${titles.join('\n')}`,
        max_tokens: 200,
      },
    });

    const summary = response.choices[0].text;

    // Afficher dans un dialog
    await context.ui.showDialog({
      title: 'Résumé AI',
      message: summary,
      buttons: ['OK'],
    });
  });
}

export async function deactivate(): Promise<void> {}
```

---

## Bonnes Pratiques

### 1. Naming Conventions

```typescript
// ID plugin : reverse-DNS
id: 'com.company.plugin-name';

// Commandes : plugin.action
('myPlugin.doSomething');

// Storage keys : descriptives
('user-preferences');
('cache-data-v2');

// Hook names : domain:event
('node:created');
('tag:applied');
```

### 2. Error Handling

```typescript
export async function activate(context: IPluginContext): Promise<void> {
  try {
    // Initialisation
    await initializePlugin(context);
  } catch (error) {
    // Log l'erreur
    console.error(`[${context.pluginId}] Activation failed:`, error);

    // Notifier l'utilisateur
    context.ui.showNotification(`Erreur d'activation: ${error.message}`, 'error');

    // Rethrow pour que le registry le sache
    throw error;
  }
}
```

### 3. Cleanup

```typescript
let unsubscribeEvent: (() => void) | null = null;

export async function activate(context: IPluginContext): Promise<void> {
  // S'abonner à un événement
  unsubscribeEvent = context.events.on('custom:event', handler);
}

export async function deactivate(): Promise<void> {
  // Cleanup des événements
  if (unsubscribeEvent) {
    unsubscribeEvent();
    unsubscribeEvent = null;
  }

  // Cleanup du storage si nécessaire
  // await context.storage.clear();
}
```

### 4. Performance

```typescript
// ❌ Mauvais : Appeler l'API à chaque hook
context.hooks.registerAction('node:created', async node => {
  const data = await fetchFromAPI(); // Lent !
  processNode(node, data);
});

// ✅ Bon : Cacher les données
let cachedData: any = null;

export async function activate(context: IPluginContext): Promise<void> {
  // Charger une fois
  cachedData = await fetchFromAPI();

  context.hooks.registerAction('node:created', async node => {
    processNode(node, cachedData); // Rapide
  });
}
```

### 5. Type Safety

```typescript
// Définir des types pour vos données
interface PluginSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  interval: number;
}

// Typer les commandes
context.commands.registerCommand(
  'myPlugin.updateSettings',
  async (settings: Partial<PluginSettings>) => {
    const current = await context.storage.get<PluginSettings>('settings');
    const updated = { ...current, ...settings };
    await context.storage.set('settings', updated);
  }
);
```

### 6. Versioning

```typescript
// Gérer les migrations de données
export async function activate(context: IPluginContext): Promise<void> {
  const version = await context.storage.get('version');

  if (!version) {
    // Première installation
    await initializeFirstTime(context);
    await context.storage.set('version', '1.0.0');
  } else if (version === '1.0.0') {
    // Migration 1.0.0 → 2.0.0
    await migrateFrom1to2(context);
    await context.storage.set('version', '2.0.0');
  }
}
```

---

## Dépannage

### Plugin ne s'Active Pas

**Problème** : Le plugin ne s'active pas

**Solutions** :

1. Vérifier que le manifest est valide (JSON Schema)
2. Vérifier que toutes les permissions sont accordées
3. Vérifier la console pour les erreurs
4. Vérifier que l'ID est unique

### Hooks ne se Déclenchent Pas

**Problème** : Les hooks enregistrés ne sont jamais appelés

**Solutions** :

1. Vérifier le nom du hook (respecter la casse)
2. S'assurer que l'événement est bien émis par le core
3. Vérifier que le plugin est bien activé
4. Logger dans le hook pour débugger

### Storage ne Persiste Pas

**Problème** : Les données stockées disparaissent

**Solutions** :

1. Vérifier que la permission `storage` est demandée
2. Vérifier que `await` est utilisé avec `set()`
3. Ne pas utiliser `clear()` dans `deactivate()` sauf si intentionnel
4. Vérifier le quota de stockage

### Commands non Trouvées

**Problème** : `Command not found` lors de l'exécution

**Solutions** :

1. Vérifier que la commande est bien enregistrée dans `activate()`
2. Vérifier l'orthographe du nom de commande
3. S'assurer que le plugin est activé
4. Vérifier que la permission `commands` est accordée

### Erreurs de Type TypeScript

**Problème** : Erreurs de compilation TypeScript

**Solutions** :

1. Installer `@cartae/plugin-system` en dépendance
2. Importer les types : `import type { IPluginContext } from '@cartae/plugin-system'`
3. Vérifier la version de TypeScript (>= 5.0)
4. Configurer `tsconfig.json` correctement

---

## Ressources

### Documentation

- [README.md](./README.md) - Documentation principale
- [API Reference](./docs/API.md) - Référence complète de l'API
- [Examples](../../examples/) - Exemples de plugins

### Support

- GitHub Issues : https://github.com/cartae/cartae/issues
- Discord : https://discord.gg/cartae
- Email : support@cartae.com

### Tools

- Plugin Template : https://github.com/cartae/plugin-template
- CLI : `npx create-cartae-plugin`
- Dev Tools Plugin : Installable depuis le marketplace

---

**Happy Plugin Development! 🚀**
