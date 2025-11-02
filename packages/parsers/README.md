# @cartae/parsers

Transform Plugin pour Cartae - Parsing de 17+ formats de fichiers.

## 🎯 Formats Supportés

### Office (Microsoft & OpenOffice)

- **DOCX** - Microsoft Word (texte + HTML)
- **XLSX** - Microsoft Excel (données tabulaires + CSV)
- **PPTX** - Microsoft PowerPoint (contenu slides)
- **ODT** - OpenDocument Text
- **ODS** - OpenDocument Spreadsheet
- **ODP** - OpenDocument Presentation

### Documents

- **PDF** - Portable Document Format (texte + métadonnées)
- **TXT** - Plain Text
- **CSV** - Comma Separated Values (parsing intelligent)
- **RTF** - Rich Text Format
- **JSON** - JavaScript Object Notation

### Images

- **JPG/JPEG** - JPEG images (dimensions + preview)
- **PNG** - PNG images
- **GIF** - GIF images
- **SVG** - SVG vector images
- **WebP, BMP, TIFF** - Autres formats image

### Email & Calendar

- **MSG** - Outlook email messages
- **EML** - RFC822 email format
- **ICS** - iCalendar events
- **VCF** - vCard contacts

### Archives

- **ZIP** - ZIP archives (liste fichiers)

## 📦 Installation

```bash
pnpm add @cartae/parsers
```

## 🚀 Usage

```typescript
import { attachmentParserService } from '@cartae/parsers';

// Parser un attachment
const result = await attachmentParserService.parseAttachment(
  'attachment-123', // ID unique (pour cache)
  contentBytesBase64, // Contenu base64
  'application/pdf', // Type MIME
  {
    extractText: true, // Extraire texte
    extractHtml: true, // Extraire HTML (DOCX)
    extractData: true, // Extraire data (XLSX, CSV)
    generatePreview: true, // Générer preview URL
    textLimit: 5000, // Limite caractères texte
    dataLimit: 100, // Limite lignes data
  }
);

// Utiliser résultat
if (!result.error) {
  console.log('Type:', result.type);
  console.log('Texte:', result.text);
  console.log('Data:', result.data);
  console.log('Metadata:', result.metadata);
  console.log('Preview URL:', result.previewUrl);
}
```

## 🏗️ Architecture

```
AttachmentParserService (orchestrateur)
  ↓ utilise
ParserFactory (factory pattern)
  ↓ instancie
17 Parsers (un par format)
  ↓ héritent
BaseAttachmentParser (classe abstraite)
  ↓ implémente
IAttachmentParser (interface)
```

## ✅ Avantages

- ✅ **Réutilisable** - Tous les plugins Cartae peuvent l'utiliser
- ✅ **Extensible** - Ajouter un format = créer un parser
- ✅ **Isolé** - Dependencies lourdes (mammoth, xlsx, pdfjs) uniquement si installé
- ✅ **Performant** - Cache intégré + lazy loading
- ✅ **Testable** - Chaque parser testé indépendamment

## 📚 Documentation

Voir [USAGE_ATTACHMENT_PARSER.md](../../cartae-private/plugins/office365-connector/USAGE_ATTACHMENT_PARSER.md) pour exemples détaillés.

## 🔧 Ajouter un Nouveau Format

1. Créer le parser (ex: `src/parsers/data/XmlParser.ts`)
2. Hériter de `BaseAttachmentParser`
3. Implémenter `parse()`
4. Enregistrer dans `ParserFactory.getAllParsers()`
5. Exporter dans `index.ts`

## 📄 License

MIT - Cartae Team
