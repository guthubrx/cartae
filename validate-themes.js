/**
 * Script de validation des thèmes - Session 55A-D
 * Vérifie la structure du système de thèmes Obsidian
 */

const fs = require('fs');
const path = require('path');

class ThemeValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validate() {
    console.log('🧠 Session 55A-D - Validation du système de thèmes');
    console.log('===================================================\n');

    // 1. Vérifier l'existence des fichiers essentiels
    this.validateEssentialFiles();

    // 2. Vérifier la structure CSS
    this.validateCSSStructure();

    // 3. Vérifier les thèmes TypeScript
    this.validateTypeScriptThemes();

    // 4. Générer le rapport
    this.generateReport();
  }

  validateEssentialFiles() {
    const essentialFiles = [
      'apps/web/src/layouts/DockableLayoutV2.css',
      'apps/web/src/core/theme/ThemeManager.ts',
      'apps/web/src/core/theme/ThemeProvider.tsx',
      'apps/web/src/core/theme/defaultThemes.ts',
      'apps/web/src/core/theme/types.ts',
    ];

    essentialFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.info.push(`✅ ${file} existe`);
      } else {
        this.errors.push(`❌ ${file} manquant`);
      }
    });
  }

  validateCSSStructure() {
    const cssPath = 'apps/web/src/layouts/DockableLayoutV2.css';
    if (!fs.existsSync(cssPath)) {
      this.errors.push(`❌ Fichier CSS manquant: ${cssPath}`);
      return;
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Vérifier la structure 3-niveaux
    const levels = [
      { name: 'Niveau 1', pattern: /NIVEAU 1: VARIABLES DE BASE/ },
      { name: 'Niveau 2', pattern: /NIVEAU 2: VARIABLES SÉMANTIQUES/ },
      { name: 'Niveau 3', pattern: /NIVEAU 3: VARIABLES COMPOSANT DOCKVIEW/ },
    ];

    levels.forEach(level => {
      if (level.pattern.test(cssContent)) {
        this.info.push(`✅ ${level.name} présent dans CSS`);
      } else {
        this.errors.push(`❌ ${level.name} manquant dans CSS`);
      }
    });

    // Vérifier les variables essentielles
    const essentialVariables = [
      '--color-white',
      '--color-black',
      '--bg-primary',
      '--bg-secondary',
      '--fg-primary',
      '--fg-secondary',
      '--dv-group-view-background-color',
    ];

    essentialVariables.forEach(variable => {
      if (cssContent.includes(variable)) {
        this.info.push(`✅ Variable CSS: ${variable}`);
      } else {
        this.warnings.push(`⚠️ Variable CSS manquante: ${variable}`);
      }
    });

    // Vérifier les modes light/dark
    if (cssContent.includes("[data-theme='dark']")) {
      this.info.push('✅ Mode dark présent');
    } else {
      this.warnings.push('⚠️ Mode dark manquant');
    }

    if (cssContent.includes(':root')) {
      this.info.push('✅ Mode light présent');
    } else {
      this.warnings.push('⚠️ Mode light manquant');
    }
  }

  validateTypeScriptThemes() {
    const tsFiles = [
      'apps/web/src/core/theme/ThemeManager.ts',
      'apps/web/src/core/theme/defaultThemes.ts',
    ];

    tsFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.errors.push(`❌ Fichier TypeScript manquant: ${file}`);
        return;
      }

      const content = fs.readFileSync(file, 'utf8');

      // Vérifier les patterns essentiels
      if (file.includes('ThemeManager')) {
        if (content.includes('class ThemeManager')) {
          this.info.push('✅ ThemeManager class définie');
        } else {
          this.errors.push('❌ ThemeManager class manquante');
        }

        if (content.includes('getInstance')) {
          this.info.push('✅ Méthode getInstance présente');
        } else {
          this.errors.push('❌ Méthode getInstance manquante');
        }

        if (content.includes('setTheme')) {
          this.info.push('✅ Méthode setTheme présente');
        } else {
          this.errors.push('❌ Méthode setTheme manquante');
        }
      }

      if (file.includes('defaultThemes')) {
        if (content.includes('lightTheme')) {
          this.info.push('✅ Thème light défini');
        } else {
          this.errors.push('❌ Thème light manquant');
        }

        if (content.includes('darkTheme')) {
          this.info.push('✅ Thème dark défini');
        } else {
          this.errors.push('❌ Thème dark manquant');
        }
      }
    });
  }

  generateReport() {
    console.log('=== RAPPORT DE VALIDATION ===\n');

    if (this.errors.length > 0) {
      console.log(`❌ ERREURS (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️ AVERTISSEMENTS (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  ${warning}`));
      console.log('');
    }

    if (this.info.length > 0) {
      console.log(`ℹ️ INFORMATIONS (${this.info.length}):`);
      this.info.forEach(info => console.log(`  ${info}`));
      console.log('');
    }

    // Résumé final
    const isValid = this.errors.length === 0;
    console.log('📊 RÉSUMÉ:');
    console.log(`- Statut: ${isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
    console.log(`- Erreurs: ${this.errors.length}`);
    console.log(`- Avertissements: ${this.warnings.length}`);
    console.log(`- Informations: ${this.info.length}`);

    if (isValid) {
      console.log('\n🎉 SYSTÈME DE THÈMES VALIDE !');
      console.log('Le système de thèmes est correctement configuré et compatible Obsidian.');
    } else {
      console.log('\n💡 Des corrections sont nécessaires avant de continuer.');
    }
  }
}

// Exécuter la validation
const validator = new ThemeValidator();
validator.validate();
