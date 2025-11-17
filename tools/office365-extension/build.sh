#!/bin/bash
# Script de build pour Cartae Office 365 Extension Firefox
# Génère un fichier .xpi installable dans Firefox

set -e

echo "🔨 Building Cartae Office 365 Extension..."

# Nom du fichier de sortie
OUTPUT_FILE="cartae-office365-extension.xpi"

# Supprimer ancien build si existant
if [ -f "$OUTPUT_FILE" ]; then
  echo "🗑️  Removing old build: $OUTPUT_FILE"
  rm "$OUTPUT_FILE"
fi

# Créer le fichier .xpi (zip des fichiers)
echo "📦 Creating .xpi package..."
zip "$OUTPUT_FILE" manifest.json background.js content-script.js README.md

# Vérifier le succès
if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo "✅ Build successful!"
  echo "📦 Output: $OUTPUT_FILE ($FILE_SIZE)"
  echo ""
  echo "📋 Installation Instructions:"
  echo "1. Open Firefox"
  echo "2. Navigate to: about:debugging#/runtime/this-firefox"
  echo "3. Click 'Load Temporary Add-on...'"
  echo "4. Select: $OUTPUT_FILE"
  echo "5. Extension will be loaded and active!"
  echo ""
  echo "📝 See README.md for detailed setup guide"
else
  echo "❌ Build failed!"
  exit 1
fi
