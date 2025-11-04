/**
 * FR: Validation des fichiers CSS de thèmes
 * EN: Theme CSS file validation
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * FR: Valide un fichier CSS de thème
 * EN: Validates a theme CSS file
 *
 * Vérifie:
 * - Taille max 500KB
 * - Absence de <script> tags
 * - Absence d'expressions JavaScript
 * - Syntaxe CSS valide
 */
export function validateThemeCSS(cssContent: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérification 1: Taille du fichier
  const sizeInKB = new Blob([cssContent]).size / 1024;
  if (sizeInKB > 500) {
    errors.push(`Fichier trop volumineux: ${sizeInKB.toFixed(2)}KB (max 500KB)`);
  }

  // Vérification 2: Pas de <script> tags
  if (/<script/gi.test(cssContent)) {
    errors.push('Balises <script> détectées - non autorisées');
  }

  // Vérification 3: Pas d'expressions JavaScript
  // Cherche: javascript:, onerror=, onload=, etc.
  const dangerousPatterns = [
    /javascript:/gi,
    /on\w+\s*=/gi, // onerror=, onload=, onclick=, etc.
    /expression\s*\(/gi, // IE expressions
    /@import\s+['"]?(?!https?:\/\/obsidian\.md)/gi, // @import from non-obsidian URLs
  ];

  dangerousPatterns.forEach((pattern) => {
    if (pattern.test(cssContent)) {
      errors.push(`Pattern dangereux détecté: ${pattern.source}`);
    }
  });

  // Vérification 4: Syntaxe CSS (braces matching)
  const openBraces = (cssContent.match(/\{/g) || []).length;
  const closeBraces = (cssContent.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(
      `Syntaxe CSS invalide: ${openBraces} accolades ouvertes vs ${closeBraces} fermées`
    );
  }

  // Avertissements 1: Variables CSS recommandées manquantes
  const recommendedVars = [
    '--background-primary',
    '--text-normal',
    '--accent-color',
    '--primary-color',
  ];

  const missingVars = recommendedVars.filter(
    (varName) => !cssContent.includes(varName)
  );

  if (missingVars.length > 0) {
    warnings.push(
      `Variables CSS recommandées manquantes: ${missingVars.join(', ')}`
    );
  }

  // Avertissements 2: URLs externes non-Obsidian
  const externalUrlPattern = /url\(['"]?(?!data:|#)(https?:\/\/(?!obsidian\.md)[^'")\s]+)/gi;
  const externalUrls = (cssContent.match(externalUrlPattern) || []).slice(0, 5);

  if (externalUrls.length > 0) {
    warnings.push(
      `URLs externes détectées (non-Obsidian): ${externalUrls.length} occurrence(s). ` +
      `Celles-ci peuvent causer des problèmes de performance.`
    );
  }

  // Avertissements 3: Fonts personnalisées
  if (/@font-face/i.test(cssContent)) {
    warnings.push(
      'Fonts personnalisées détectées - vérifiez les URLs pour les licenses.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * FR: Nettoie un CSS en supprimant les codes dangereux
 * EN: Sanitizes CSS by removing dangerous code
 */
export function sanitizeCSS(cssContent: string): string {
  let sanitized = cssContent;

  // Supprimer les <script> tags complètes
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Supprimer les attributs d'événements (onerror=, onload=, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Supprimer javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Supprimer @import de sources non-fiables
  sanitized = sanitized.replace(
    /@import\s+['"]?(?!https?:\/\/obsidian\.md)[^;]*;?/gi,
    ''
  );

  return sanitized;
}

/**
 * FR: Extrait les variables CSS d'un fichier CSS
 * EN: Extracts CSS variables from CSS file
 */
export function extractCSSVariables(cssContent: string): Map<string, string> {
  const variables = new Map<string, string>();

  // Cherche les déclarations de variables CSS (--variable: value;)
  const varPattern = /--[\w-]+\s*:\s*([^;]+);/g;
  let match;

  while ((match = varPattern.exec(cssContent)) !== null) {
    const fullMatch = match[0];
    const varName = fullMatch.split(':')[0].trim();
    const varValue = match[1].trim();

    variables.set(varName, varValue);
  }

  return variables;
}

/**
 * FR: Vérifie la couverture des variables CSS
 * EN: Checks CSS variable coverage
 */
export function checkVariableCoverage(
  cssContent: string,
  requiredVars: string[]
): { coverage: number; missing: string[] } {
  const variables = extractCSSVariables(cssContent);
  const variableNames = Array.from(variables.keys());

  const missing = requiredVars.filter((varName) => !variableNames.includes(varName));

  const coverage = ((requiredVars.length - missing.length) / requiredVars.length) * 100;

  return {
    coverage: Math.round(coverage),
    missing,
  };
}
