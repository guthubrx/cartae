/**
 * FR: Parser pour extraction des variables CSS d'un thème Obsidian
 * EN: Parser for extracting CSS variables from Obsidian theme files
 */

export interface ParsedTheme {
  light: Map<string, string>;
  dark: Map<string, string>;
  metadata: {
    name?: string;
    author?: string;
    version?: string;
  };
}

/**
 * FR: Parse un fichier CSS Obsidian et extrait les variables
 * EN: Parse Obsidian CSS file and extract variables
 *
 * Extrait:
 * - Variables du bloc :root (mode clair/défaut)
 * - Variables du bloc .theme-dark (mode sombre)
 * - Résout les références récursives (var(--other))
 * - Extract metadata (@name, @author, @version)
 */
export function parseObsidianTheme(cssContent: string): ParsedTheme {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  // Extract :root block (light mode variables)
  const rootMatch = cssContent.match(/:root\s*\{([^}]*)\}/s);
  if (rootMatch) {
    const rootVars = parseVariablesBlock(rootMatch[1]);
    rootVars.forEach((value, key) => {
      light.set(key, value);
    });
  }

  // Extract .theme-dark block (dark mode variables)
  const darkMatch = cssContent.match(/\.theme-dark\s*\{([^}]*)\}/s);
  if (darkMatch) {
    const darkVars = parseVariablesBlock(darkMatch[1]);
    darkVars.forEach((value, key) => {
      dark.set(key, value);
    });
  }

  // Resolve recursive references (var(--other))
  const allVars = new Map([...light, ...dark]);
  const resolvedLight = new Map<string, string>();
  const resolvedDark = new Map<string, string>();

  light.forEach((value, key) => {
    resolvedLight.set(key, resolveVariableValue(value, allVars, new Set()));
  });

  dark.forEach((value, key) => {
    resolvedDark.set(key, resolveVariableValue(value, allVars, new Set()));
  });

  // Extract metadata
  const metadata = {
    name: extractMetadata(cssContent, '@name'),
    author: extractMetadata(cssContent, '@author'),
    version: extractMetadata(cssContent, '@version'),
  };

  return {
    light: resolvedLight,
    dark: resolvedDark,
    metadata,
  };
}

/**
 * FR: Parse un bloc CSS et extrait les variables
 * EN: Parse CSS block and extract variables
 */
function parseVariablesBlock(blockContent: string): Map<string, string> {
  const variables = new Map<string, string>();
  const varPattern = /--[\w-]+\s*:\s*([^;]+);/g;
  let match;

  while ((match = varPattern.exec(blockContent)) !== null) {
    const fullMatch = match[0];
    const varName = fullMatch.split(':')[0].trim();
    const varValue = match[1].trim();
    variables.set(varName, varValue);
  }

  return variables;
}

/**
 * FR: Résout les références de variables récursives
 * EN: Resolve recursive variable references (var(--other))
 *
 * Limite: depth = 10 max, Set visited pour éviter boucles infinies
 */
function resolveVariableValue(
  value: string,
  allVars: Map<string, string>,
  visited: Set<string>,
  depth: number = 0
): string {
  const MAX_DEPTH = 10;

  if (depth > MAX_DEPTH) {
    return value;
  }

  // Check if value contains var() reference
  if (!value.includes('var(')) {
    return value;
  }

  // Replace var(--name) with actual value
  const resolved = value.replace(/var\(--([^)]+)\)/g, (match, varName) => {
    const fullVarName = `--${varName}`;

    // Prevent infinite loops
    if (visited.has(fullVarName)) {
      return match; // Return unchanged to prevent loop
    }

    const refValue = allVars.get(fullVarName);
    if (!refValue) {
      return match; // Variable not found, return unchanged
    }

    // Add to visited set for this resolution
    const newVisited = new Set(visited);
    newVisited.add(fullVarName);

    // Recursively resolve
    return resolveVariableValue(refValue, allVars, newVisited, depth + 1);
  });

  return resolved;
}

/**
 * FR: Extrait les métadonnées du CSS (commentaires spéciaux)
 * EN: Extract metadata from CSS (special comments)
 *
 * Cherche: @name, @author, @version dans commentaires
 */
function extractMetadata(cssContent: string, metaKey: string): string | undefined {
  const pattern = new RegExp(`${metaKey}\\s*[:\s]+([^;\\n]+)`, 'i');
  const match = cssContent.match(pattern);
  return match ? match[1].trim() : undefined;
}

/**
 * FR: Merge les variables light et dark en une seule map avec suffixes
 * EN: Merge light and dark variables into single map with suffixes
 *
 * Format: --color → --color-light, --color-dark
 */
export function mergeThemeVariables(
  light: Map<string, string>,
  dark: Map<string, string>
): Map<string, string> {
  const merged = new Map<string, string>();

  // Add all light variables with -light suffix
  light.forEach((value, key) => {
    merged.set(`${key}-light`, value);
  });

  // Add all dark variables with -dark suffix
  dark.forEach((value, key) => {
    merged.set(`${key}-dark`, value);
  });

  return merged;
}

/**
 * FR: Convertit une ParsedTheme en format plat (clé: valeur)
 * EN: Convert ParsedTheme to flat format (key: value)
 */
export function flattenTheme(theme: ParsedTheme, mode: 'light' | 'dark' = 'light'): Record<string, string> {
  const sourceMap = mode === 'light' ? theme.light : theme.dark;
  const result: Record<string, string> = {};

  sourceMap.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * FR: Valide que les variables essentielles sont présentes
 * EN: Validate that essential variables are present
 */
export function validateThemeVariables(
  theme: ParsedTheme,
  essentialVars: string[] = ['--color-base', '--color-text', '--color-accent']
): { valid: boolean; missing: string[] } {
  const allVars = new Set<string>();

  theme.light.forEach((_, key) => allVars.add(key));
  theme.dark.forEach((_, key) => allVars.add(key));

  const missing = essentialVars.filter((varName) => !allVars.has(varName));

  return {
    valid: missing.length === 0,
    missing,
  };
}
