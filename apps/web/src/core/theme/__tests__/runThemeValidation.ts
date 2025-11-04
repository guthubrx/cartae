/**
 * Script de validation des thèmes
 * Session 55A-D: Obsidian Theme Foundations
 *
 * Exécute la validation du système de thèmes et génère un rapport
 */

import { ThemeValidator } from '../ThemeValidator.js';

// Fonction principale
export function runThemeValidation(): void {
  console.log('🧠 Session 55A-D - Validation du système de thèmes');
  console.log('===================================================\n');

  try {
    // Exécuter la validation
    const report = ThemeValidator.generateValidationReport();

    // Afficher le rapport
    console.log(report);

    // Vérifier si le système est valide
    const validation = ThemeValidator.validateThemeSystem();

    if (validation.isValid) {
      console.log('✅ SYSTÈME DE THÈMES VALIDE');
      console.log('Le système de thèmes est correctement configuré et compatible Obsidian.');
    } else {
      console.log('❌ SYSTÈME DE THÈMES INVALIDE');
      console.log('Des corrections sont nécessaires avant de continuer.');
    }

    // Afficher un résumé
    console.log('\n📊 RÉSUMÉ:');
    console.log(`- Erreurs: ${validation.errors.length}`);
    console.log(`- Avertissements: ${validation.warnings.length}`);
    console.log(`- Informations: ${validation.info.length}`);
  } catch (error) {
    console.error('❌ ERREUR lors de la validation:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runThemeValidation();
}
