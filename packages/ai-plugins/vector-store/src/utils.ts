/**
 * Utilitaires pour calculs vectoriels
 */

/**
 * Calcule la similarité cosinus entre deux vecteurs
 * @param vec1 Premier vecteur
 * @param vec2 Second vecteur
 * @returns Score de similarité (0-1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Les vecteurs doivent avoir la même dimension');
  }

  if (vec1.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const similarity = dotProduct / (mag1 * mag2);
  // Clamp à [0, 1] pour éviter erreurs d'arrondi
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Normalise un vecteur
 * @param vec Vecteur à normaliser
 * @returns Vecteur normalisé
 */
export function normalizeVector(vec: number[]): number[] {
  let magnitude = 0;

  for (let i = 0; i < vec.length; i++) {
    magnitude += vec[i] * vec[i];
  }

  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return vec;
  }

  return vec.map(v => v / magnitude);
}

/**
 * Valide la dimension d'un vecteur
 * @param vec Vecteur à valider
 * @param expectedDimension Dimension attendue
 * @throws Si les dimensions ne correspondent pas
 */
export function validateDimension(vec: number[], expectedDimension: number): void {
  if (vec.length !== expectedDimension) {
    throw new Error(
      `Dimension vecteur invalide: ${vec.length} (attendu: ${expectedDimension})`
    );
  }
}
