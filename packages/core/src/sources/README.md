# Sources - Gestion des Sources de Données Externes

Module pour gérer les sources de données externes (Office365, Gmail, Slack, GitHub, etc.) et synchroniser leurs données vers le format universel CartaeItem.

## Architecture

```
sources/
├── types.ts                       # Types TypeScript partagés
├── SourceManager.ts               # Service principal de gestion
├── IndexedDBSourceStorage.ts      # Implémentation IndexedDB du storage
├── connectors/                    # Connecteurs pour sources spécifiques
│   └── MockConnector.ts           # Connecteur de test/démo
├── __tests__/                     # Tests unitaires
│   └── SourceManager.test.ts
├── index.ts                       # Point d'entrée du module
└── README.md                      # Cette documentation
```

## Concepts

### SourceConfig
Configuration d'une source de données externe :
- **id**: Identifiant unique
- **name**: Nom donné par l'utilisateur
- **connectorType**: Type de connecteur (office365-mail, gmail, slack, etc.)
- **config**: Configuration spécifique au connecteur (credentials, endpoints, etc.)
- **status**: Statut actuel (active, paused, error, configuring)
- **fieldMappings**: Mappings de champs source → CartaeItem
- **autoSync**: Synchronisation automatique activée/désactivée
- **syncInterval**: Intervalle de sync auto (en minutes)

### SourceConnector
Interface pour implémenter un connecteur de source :
- **testConnection()**: Tester la connectivité et les credentials
- **sync()**: Synchroniser les données depuis la source
- **validateConfig()**: Valider la configuration

### FieldMapping
Définit comment transformer les données source en CartaeItem :
- **sourceField**: Chemin du champ dans les données source (ex: "from.emailAddress.address")
- **targetField**: Champ cible dans CartaeItem (ex: "metadata.author")
- **transform**: Transformation à appliquer (date, array, string, etc.)

## Installation

```typescript
import {
  SourceManager,
  IndexedDBSourceStorage,
  MockConnector,
} from '@cartae/core/sources';
```

## Utilisation

### 1. Initialiser le SourceManager

```typescript
const storage = new IndexedDBSourceStorage();
const mockConnector = new MockConnector();

const sourceManager = new SourceManager({
  storage,
  connectors: new Map([
    ['mock', mockConnector],
    // Ajouter d'autres connecteurs ici
  ]),
  enableAutoSync: true,
  autoSyncCheckInterval: 60000, // 1 minute
});
```

### 2. Créer une Source

```typescript
const source = await sourceManager.createSource(
  'My Office365 Mailbox',       // Nom
  'office365-mail',              // Type de connecteur
  {                              // Configuration du connecteur
    tenantId: 'xxx-xxx-xxx',
    clientId: 'yyy-yyy-yyy',
    clientSecret: 'zzz-zzz-zzz',
    userEmail: 'user@domain.com',
  },
  [                              // Field mappings
    { id: '1', sourceField: 'subject', targetField: 'title' },
    { id: '2', sourceField: 'bodyPreview', targetField: 'content' },
    { id: '3', sourceField: 'from.emailAddress.address', targetField: 'metadata.author' },
    { id: '4', sourceField: 'receivedDateTime', targetField: 'metadata.startDate', transform: 'date' },
  ],
  {
    autoSync: true,              // Activer sync automatique
    syncInterval: 15,            // Toutes les 15 minutes
  }
);

console.log('Source créée:', source.id);
```

### 3. Tester la Connexion

```typescript
const testResult = await sourceManager.testConnection(source.id);

if (testResult.success) {
  console.log('✓ Connexion réussie:', testResult.message);
  console.log('Permissions:', testResult.details?.permissions);
} else {
  console.error('✗ Échec connexion:', testResult.message);
  console.error('Erreurs:', testResult.errors);
}
```

### 4. Synchroniser une Source

```typescript
const syncResult = await sourceManager.syncSource(source.id, {
  limit: 100,                    // Limiter à 100 items
  force: true,                   // Forcer même si sync récente
  onProgress: (progress) => {    // Callback de progression
    console.log(
      `Progression: ${progress.percentage}% ` +
      `(${progress.processed}/${progress.total}) - ` +
      `ETA: ${progress.eta}ms`
    );
  },
});

if (syncResult.success) {
  console.log(`✓ Sync réussie: ${syncResult.itemsSuccess} items importés`);
} else {
  console.error(`✗ Sync échouée: ${syncResult.error}`);
}
```

### 5. Récupérer l'Historique de Sync

```typescript
const history = await sourceManager.getSyncHistory(source.id, 10);

for (const entry of history) {
  console.log(
    `[${entry.startedAt.toISOString()}] ` +
    `${entry.status} - ${entry.itemsSuccess}/${entry.itemsProcessed} items ` +
    `(${entry.duration}ms)`
  );
}
```

### 6. Gérer les Événements

```typescript
// Écouter création de source
sourceManager.on('source:created', (source) => {
  console.log('Nouvelle source créée:', source.name);
});

// Écouter début de sync
sourceManager.on('source:sync:started', ({ sourceId }) => {
  console.log('Sync démarrée pour:', sourceId);
});

// Écouter fin de sync
sourceManager.on('source:sync:completed', (result) => {
  console.log(`Sync terminée: ${result.itemsSuccess} items importés`);
});

// Écouter erreurs de sync
sourceManager.on('source:sync:failed', ({ sourceId, error }) => {
  console.error(`Erreur sync ${sourceId}:`, error);
});

// Écouter progression de sync
sourceManager.on('source:sync:progress', ({ sourceId, progress }) => {
  console.log(`${sourceId}: ${progress.percentage}%`);
});
```

### 7. Mettre à Jour / Supprimer une Source

```typescript
// Mettre à jour
await sourceManager.updateSource(source.id, {
  name: 'Nouveau nom',
  autoSync: false,
});

// Changer le statut
await sourceManager.setSourceStatus(source.id, 'paused');

// Supprimer
await sourceManager.deleteSource(source.id);
```

## Créer un Connecteur Custom

Pour créer un connecteur pour une nouvelle source de données :

```typescript
import type { SourceConnector } from '@cartae/core/sources';
import type { FieldMapping, TestConnectionResult, SyncOptions } from '@cartae/core/sources';
import type { CartaeItem } from '@cartae/core';

export class MyCustomConnector implements SourceConnector {
  type = 'my-custom-source';

  /**
   * Valider la configuration
   */
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('apiKey est requis');
    }

    if (!config.endpoint) {
      errors.push('endpoint est requis');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tester la connexion
   */
  async testConnection(config: Record<string, any>): Promise<TestConnectionResult> {
    try {
      // Tester l'API endpoint
      const response = await fetch(config.endpoint, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Erreur HTTP ${response.status}`,
          errors: [await response.text()],
        };
      }

      return {
        success: true,
        message: 'Connexion réussie',
        details: {
          endpoint: config.endpoint,
          auth: 'ok',
          latency: 100,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        errors: [error instanceof Error ? error.stack || error.message : 'Erreur inconnue'],
      };
    }
  }

  /**
   * Synchroniser les données
   */
  async sync(
    config: Record<string, any>,
    fieldMappings: FieldMapping[],
    options?: SyncOptions
  ): Promise<{ items: CartaeItem[]; errors?: Array<{ itemId: string; error: string }> }> {
    const items: CartaeItem[] = [];
    const errors: Array<{ itemId: string; error: string }> = [];

    try {
      // 1. Récupérer les données depuis l'API
      const response = await fetch(`${config.endpoint}/items`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });

      const rawItems = await response.json();

      // 2. Transformer chaque item selon les field mappings
      for (let i = 0; i < rawItems.length; i++) {
        const rawItem = rawItems[i];

        // Callback de progression
        if (options?.onProgress) {
          options.onProgress({
            processed: i,
            total: rawItems.length,
            percentage: Math.round((i / rawItems.length) * 100),
            rate: 10,
            eta: ((rawItems.length - i) / 10) * 1000,
            currentItem: rawItem.id,
          });
        }

        try {
          // Appliquer les field mappings
          const cartaeItem = this.transformItem(rawItem, fieldMappings);
          items.push(cartaeItem);
        } catch (error) {
          errors.push({
            itemId: rawItem.id,
            error: error instanceof Error ? error.message : 'Erreur transformation',
          });
        }
      }

      return { items, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      throw new Error(
        `Erreur sync: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Transformer un item source en CartaeItem
   */
  private transformItem(rawItem: any, fieldMappings: FieldMapping[]): CartaeItem {
    const cartaeItem: CartaeItem = {
      id: `custom_${rawItem.id}`,
      type: 'document', // À déterminer selon la source
      title: '',
      content: '',
      source: 'my-custom-source',
      sourceId: rawItem.id,
      priority: 'medium',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { raw: rawItem },
    };

    // Appliquer les field mappings
    for (const mapping of fieldMappings) {
      const sourceValue = this.getNestedValue(rawItem, mapping.sourceField);
      if (sourceValue !== undefined) {
        const transformedValue = this.applyTransform(sourceValue, mapping.transform);
        this.setNestedValue(cartaeItem, mapping.targetField, transformedValue);
      }
    }

    return cartaeItem;
  }

  /**
   * Récupérer valeur d'un chemin nested (ex: "user.email")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Définir valeur d'un chemin nested
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Appliquer transformation
   */
  private applyTransform(value: any, transform?: string): any {
    if (!transform || transform === 'none') return value;

    switch (transform) {
      case 'date':
        return new Date(value);
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      default:
        return value;
    }
  }
}
```

Ensuite, enregistrer le connecteur :

```typescript
const customConnector = new MyCustomConnector();
sourceManager.registerConnector(customConnector);
```

## Tests

Lancer les tests unitaires :

```bash
pnpm test packages/core/src/sources/__tests__
```

## Exemple Complet

```typescript
import {
  SourceManager,
  IndexedDBSourceStorage,
  MockConnector,
} from '@cartae/core/sources';

async function main() {
  // 1. Initialiser
  const storage = new IndexedDBSourceStorage();
  const manager = new SourceManager({
    storage,
    connectors: new Map([['mock', new MockConnector()]]),
    enableAutoSync: false,
  });

  // 2. Créer une source
  const source = await manager.createSource(
    'Test Source',
    'mock',
    {
      endpoint: 'https://api.test.com',
      apiKey: 'test-key',
      mockItemCount: 10,
    },
    [
      { id: '1', sourceField: 'title', targetField: 'title' },
      { id: '2', sourceField: 'body', targetField: 'content' },
    ]
  );

  console.log('Source créée:', source.id);

  // 3. Tester connexion
  const testResult = await manager.testConnection(source.id);
  console.log('Test connexion:', testResult.success ? '✓' : '✗');

  // 4. Synchroniser
  const syncResult = await manager.syncSource(source.id, {
    onProgress: (p) => console.log(`${p.percentage}%`),
  });

  console.log(`Sync: ${syncResult.itemsSuccess} items importés`);

  // 5. Voir historique
  const history = await manager.getSyncHistory(source.id);
  console.log(`Historique: ${history.length} entrées`);

  // 6. Nettoyer
  manager.destroy();
  storage.close();
}

main().catch(console.error);
```

## API Reference

Voir les fichiers de types pour la documentation complète :
- **types.ts** : Tous les types TypeScript
- **SourceManager.ts** : API du SourceManager
- **IndexedDBSourceStorage.ts** : Implémentation du storage

## Prochaines Étapes

1. Implémenter connecteurs réels (Office365Connector, GmailConnector, etc.)
2. Ajouter authentification OAuth2 pour connecteurs
3. Implémenter système de retry pour syncs échouées
4. Ajouter support pour webhooks (sync push au lieu de pull)
5. Créer UI d'administration des sources (déjà fait dans packages/ui)
