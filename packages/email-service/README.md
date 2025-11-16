# @cartae/email-service

Service d'envoi d'emails configurable multi-providers pour Cartae.

## Features

- **Multi-providers** : Resend, SendGrid, AWS SES, Console (dev)
- **Configuration flexible** : Variables d'environnement
- **Templates Handlebars** : HTML responsive + génération texte auto
- **Type-safe** : TypeScript avec types complets
- **Zero vendor lock-in** : Switch provider sans changer le code
- **Development-friendly** : ConsoleProvider pour dev local

## Installation

```bash
pnpm add @cartae/email-service

# Installer le provider de votre choix (optionnel)
pnpm add resend          # Recommandé pour production
pnpm add @sendgrid/mail  # Alternative
pnpm add @aws-sdk/client-ses  # AWS SES
```

## Configuration

### Variables d'environnement

```bash
# Provider (console, resend, sendgrid, ses)
EMAIL_PROVIDER=console

# Configuration commune
EMAIL_FROM=noreply@cartae.dev
EMAIL_FROM_NAME=Cartae

# Resend (recommandé)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxx

# SendGrid
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxx

# AWS SES
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Console (dev - aucune config requise)
EMAIL_PROVIDER=console
EMAIL_LOG_LEVEL=debug  # ou 'info'
```

## Usage Basique

### Envoi d'un email simple

```typescript
import { EmailService } from '@cartae/email-service';

// Créer le service depuis les variables d'env
const emailService = EmailService.fromEnv();

// Envoyer un email
await emailService.send({
  to: { email: 'user@example.com', name: 'John Doe' },
  subject: 'Bienvenue !',
  html: '<h1>Bonjour John</h1><p>Bienvenue sur Cartae !</p>',
  text: 'Bonjour John\n\nBienvenue sur Cartae !',
});
```

### Envoi depuis un template Handlebars

```typescript
// Template: packages/email-service/src/templates/welcome.hbs
await emailService.sendTemplate(
  'welcome',
  { email: 'user@example.com', name: 'John Doe' },
  {
    userName: 'John',
    dashboardUrl: 'https://cartae.dev/dashboard',
    docsUrl: 'https://docs.cartae.dev',
  }
);
```

## Templates Disponibles

| Template | Sujet | Usage |
|----------|-------|-------|
| `welcome.hbs` | Bienvenue sur Cartae | Nouvel utilisateur |
| `password-reset.hbs` | Réinitialisation mot de passe | Reset password |
| `vault-sealed.hbs` | 🚨 Vault sealed | Alerte admin |
| `postgres-down.hbs` | 🚨 PostgreSQL down | Alerte admin |
| `quota-warning.hbs` | ⚠️ Quota à 80% | Warning utilisateur |
| `quota-exceeded.hbs` | 🚫 Quota dépassé | Erreur utilisateur |
| `security-alert.hbs` | 🔒 Alerte sécurité | Tentative accès suspect |

## Créer un Template Custom

1. Créer `packages/email-service/src/templates/mon-template.hbs`
2. Ajouter le sujet en commentaire HTML :

```html
<!-- SUBJECT: Mon sujet dynamique {{variable}} -->
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mon Template</title>
  <style>
    /* Styles inline pour compatibilité email */
  </style>
</head>
<body>
  <h1>Bonjour {{userName}} !</h1>
  <p>{{message}}</p>
</body>
</html>
```

3. Utiliser :

```typescript
await emailService.sendTemplate('mon-template', to, {
  variable: 'valeur',
  userName: 'John',
  message: 'Votre message ici',
});
```

## Handlebars Helpers Disponibles

```handlebars
{{formatDate timestamp}}     <!-- 16 novembre 2025, 15:30 -->
{{uppercase text}}            <!-- TEXTE EN MAJUSCULES -->
{{formatCurrency 1234.56}}    <!-- 1 234,56 € -->
```

## Configuration Avancée

### Utiliser un provider spécifique

```typescript
import { EmailService, ResendProvider } from '@cartae/email-service';

const emailService = new EmailService({
  provider: 'resend',
  from: { email: 'noreply@cartae.dev', name: 'Cartae' },
  resend: { apiKey: 're_xxx' },
});
```

### Envoyer avec pièces jointes

```typescript
await emailService.send({
  to: { email: 'user@example.com' },
  subject: 'Document important',
  html: '<p>Voir pièce jointe</p>',
  attachments: [
    {
      filename: 'report.pdf',
      content: Buffer.from(pdfData),
      contentType: 'application/pdf',
    },
  ],
});
```

### Valider la configuration

```typescript
const isValid = await emailService.validateConfig();
if (!isValid) {
  console.error('Email provider mal configuré !');
}
```

## Development

### Console Provider (par défaut en dev)

Le ConsoleProvider affiche les emails dans la console au lieu de les envoyer :

```bash
EMAIL_PROVIDER=console
EMAIL_LOG_LEVEL=debug  # Afficher le HTML complet
```

Output console :

```
================================================================================
📧 EMAIL (Console Provider - Dev Mode)
================================================================================
ID:      console-1731759600-abc123
From:    Cartae <noreply@cartae.dev>
To:      John Doe <john@example.com>
Subject: Bienvenue sur Cartae !
--------------------------------------------------------------------------------
HTML VERSION: (set EMAIL_LOG_LEVEL=debug to see full HTML)
<!DOCTYPE html>...
--------------------------------------------------------------------------------
✅ Email envoyé (console only, pas d'envoi réel)
================================================================================
```

## Migration entre Providers

### Dev → Production

```bash
# Dev local
EMAIL_PROVIDER=console

# Staging
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_test_xxx

# Production
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_prod_xxx
```

Aucun changement de code requis ! 🎉

## Comparaison Providers

| Provider | Prix | Setup | Features | Recommandé pour |
|----------|------|-------|----------|-----------------|
| **Console** | Gratuit | 0 min | Logs seulement | Dev local |
| **Resend** | $0.01/email | 5 min | API moderne, webhooks | Production (recommandé) |
| **SendGrid** | $0.01/email | 10 min | Features avancées | Enterprise |
| **AWS SES** | $0.0001/email | 15 min | Intégration AWS | Déjà sur AWS |

## Architecture

```
packages/email-service/
├── src/
│   ├── EmailService.ts           # Service principal (factory)
│   ├── types/index.ts            # Types TypeScript
│   ├── providers/
│   │   ├── ConsoleProvider.ts    # Dev (logs console)
│   │   ├── ResendProvider.ts     # Production (recommandé)
│   │   ├── SendGridProvider.ts   # Alternative
│   │   └── SESProvider.ts        # AWS
│   ├── templates/
│   │   ├── welcome.hbs
│   │   ├── password-reset.hbs
│   │   └── ... (7 templates)
│   └── utils/
│       └── templateRenderer.ts   # Handlebars renderer
└── package.json
```

## Tests

```bash
cd packages/email-service
pnpm test
```

## Build

```bash
pnpm build
```

## Troubleshooting

### `Provider "resend" requis`

➜ Installez le package : `pnpm add resend`

### `Template "xyz" introuvable`

➜ Vérifiez que le fichier `src/templates/xyz.hbs` existe

### `Resend API key invalide`

➜ Vérifiez `EMAIL_API_KEY` dans `.env`

## License

MIT - Cartae Project
