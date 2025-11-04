/**
 * Obsidian Theme Parser
 * Parse les fichiers CSS de thèmes Obsidian pour extraire les variables CSS
 */

export interface ObsidianCSSVariables {
  [key: string]: string;
}

export class ObsidianThemeParser {
  parse(cssContent: string): ObsidianCSSVariables {
    const variables: ObsidianCSSVariables = {};
    const cleanedContent = this.removeComments(cssContent);
    const variableRegex = /--([\w-]+)\s*:\s*([^;]+);/g;

    let match: RegExpExecArray | null = variableRegex.exec(cleanedContent);
    while (match !== null) {
      const variableName = `--${match[1]}`;
      const variableValue = match[2].trim();
      variables[variableName] = variableValue;
      match = variableRegex.exec(cleanedContent);
    }

    return variables;
  }

  async parseFromUrl(url: string): Promise<ObsidianCSSVariables> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch theme from ${url}: ${response.statusText}`);
      }
      const cssContent = await response.text();
      return this.parse(cssContent);
    } catch (error) {
      throw new Error(
        `Error parsing theme from URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async parseFromFile(file: File): Promise<ObsidianCSSVariables> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const cssContent = event.target?.result as string;
        try {
          const variables = this.parse(cssContent);
          resolve(variables);
        } catch (error) {
          reject(
            new Error(
              `Error parsing theme file: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading theme file'));
      };
      reader.readAsText(file);
    });
  }

  private removeComments(cssContent: string): string {
    const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
    let cleaned = cssContent.replace(blockCommentRegex, '');
    const lineCommentRegex = /\/\/.*$/gm;
    cleaned = cleaned.replace(lineCommentRegex, '');
    return cleaned;
  }

  resolveVariableReferences(variables: ObsidianCSSVariables): ObsidianCSSVariables {
    const resolved: ObsidianCSSVariables = { ...variables };
    const maxIterations = 20; // Augmenté pour variables profondément imbriquées

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasChanges = false;

      for (const [key, value] of Object.entries(resolved)) {
        const newValue = this.resolveVariableReferencesDeep(value, resolved);
        if (newValue !== value) {
          resolved[key] = newValue;
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        break;
      }
    }

    return resolved;
  }

  /**
   * Résolution profonde récursive des variables CSS
   * Gère les cas complexes : var(--a, var(--b, var(--c)))
   */
  private resolveVariableReferencesDeep(
    value: string,
    variables: ObsidianCSSVariables,
    depth = 0,
    maxDepth = 10
  ): string {
    if (depth > maxDepth) {
      return value; // Prévenir récursion infinie
    }

    // Regex pour capturer var() avec fallback potentiellement complexe
    const varRegex = /var\((--[\w-]+)(?:,\s*([^)]+))?\)/g;
    let newValue = value;
    let match: RegExpExecArray | null = varRegex.exec(value);

    while (match !== null) {
      const fullMatch = match[0];
      const referencedVar = match[1];
      const fallbackValue = match[2];

      let replacement: string;

      if (variables[referencedVar]) {
        // Variable existe, résoudre récursivement
        replacement = this.resolveVariableReferencesDeep(
          variables[referencedVar],
          variables,
          depth + 1,
          maxDepth
        );
      } else if (fallbackValue) {
        // Utiliser fallback, qui peut lui-même contenir des var()
        replacement = this.resolveVariableReferencesDeep(
          fallbackValue.trim(),
          variables,
          depth + 1,
          maxDepth
        );
      } else {
        // Pas de variable ni fallback, garder tel quel
        replacement = fullMatch;
      }

      newValue = newValue.replace(fullMatch, replacement);
      match = varRegex.exec(value);
    }

    return newValue;
  }

  /**
   * Évalue les expressions calc() CSS
   * Supporte: calc(100% - 20px), calc(2 * 16px), etc.
   */
  resolveCalcExpressions(variables: ObsidianCSSVariables): ObsidianCSSVariables {
    const resolved: ObsidianCSSVariables = {};

    for (const [key, value] of Object.entries(variables)) {
      resolved[key] = this.evaluateCalc(value);
    }

    return resolved;
  }

  /**
   * Évalue une expression calc() individuelle
   */
  private evaluateCalc(value: string): string {
    const calcRegex = /calc\(([^)]+)\)/g;
    let newValue = value;
    let match: RegExpExecArray | null = calcRegex.exec(value);

    while (match !== null) {
      const fullMatch = match[0];
      const expression = match[1].trim();

      try {
        const result = this.evaluateCalcExpression(expression);
        newValue = newValue.replace(fullMatch, result);
      } catch (error) {
        // Si évaluation échoue, garder calc() tel quel
        // Certains calc() complexes avec unités mixtes ne peuvent pas être évalués
      }

      match = calcRegex.exec(value);
    }

    return newValue;
  }

  /**
   * Évalue l'expression mathématique dans calc()
   * Support basique: +, -, *, /
   */
  private evaluateCalcExpression(expression: string): string {
    // Simplification: si expression contient des unités mixtes ou % avec px,
    // on ne peut pas évaluer, donc on retourne calc() tel quel
    const hasMixedUnits = /(\d+)(%|px|em|rem|vh|vw).*(\d+)(%|px|em|rem|vh|vw)/.test(expression);

    if (hasMixedUnits) {
      return `calc(${expression})`;
    }

    // Si expression simple avec une seule unité ou sans unité
    try {
      // Extraire nombres et unité
      const numberRegex = /(\d+\.?\d*)/g;
      const numbers = expression.match(numberRegex);
      const unitMatch = expression.match(/(%|px|em|rem|vh|vw)/);
      const unit = unitMatch ? unitMatch[0] : '';

      if (!numbers || numbers.length === 0) {
        return `calc(${expression})`;
      }

      // Évaluer expression simple
      // NOTE: eval() généralement déconseillé, mais ici sur expression contrôlée
      const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(sanitizedExpression);

      return `${result}${unit}`;
    } catch (error) {
      return `calc(${expression})`;
    }
  }
}
