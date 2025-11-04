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
    const maxIterations = 10;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasUnresolvedReferences = false;

      for (const [key, value] of Object.entries(resolved)) {
        const varRegex = /var\((--[\w-]+)(?:,\s*([^)]+))?\)/g;
        let newValue = value;
        let match: RegExpExecArray | null = varRegex.exec(value);

        while (match !== null) {
          const referencedVar = match[1];
          const fallbackValue = match[2];

          if (resolved[referencedVar]) {
            newValue = newValue.replace(match[0], resolved[referencedVar]);
            hasUnresolvedReferences = true;
          } else if (fallbackValue) {
            newValue = newValue.replace(match[0], fallbackValue.trim());
          }
          match = varRegex.exec(value);
        }

        resolved[key] = newValue;
      }

      if (!hasUnresolvedReferences) {
        break;
      }
    }

    return resolved;
  }
}
