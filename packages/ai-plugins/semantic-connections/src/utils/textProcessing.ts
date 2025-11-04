/**
 * Utilitaires de traitement de texte pour analyse sémantique
 */

/**
 * Mots vides français et anglais à exclure de l'analyse
 */
const STOP_WORDS = new Set([
  // Français
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais',
  'donc', 'or', 'ni', 'car', 'est', 'sont', 'a', 'ont', 'dans', 'pour',
  'par', 'sur', 'avec', 'sans', 'sous', 'ce', 'cette', 'ces', 'mon', 'ma',
  'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre',
  'vos', 'leur', 'leurs', 'qui', 'que', 'quoi', 'dont', 'où', 'il', 'elle',
  'on', 'nous', 'vous', 'ils', 'elles', 'je', 'tu', 'me', 'te', 'se', 'ne',
  'pas', 'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup', 'bien', 'mal',
  // Anglais
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
  'should', 'now', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could',
]);

/**
 * Nettoie et normalise le texte
 * - Convertit en minuscules
 * - Supprime la ponctuation
 * - Supprime les caractères spéciaux
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s#@]/g, ' ') // Garde les # et @ (tags et mentions)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize le texte en mots
 * - Sépare sur les espaces
 * - Filtre les mots vides
 * - Filtre les mots trop courts (< 3 caractères)
 */
export function tokenize(text: string, removeStopWords = true): string[] {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/);

  return tokens.filter((token) => {
    if (token.length < 3) return false; // Mots trop courts
    if (removeStopWords && STOP_WORDS.has(token)) return false;
    return true;
  });
}

/**
 * Extrait les hashtags d'un texte
 * @example "#urgent #client #budget" => ["urgent", "client", "budget"]
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = [...text.matchAll(hashtagRegex)];
  return matches.map((match) => match[1].toLowerCase());
}

/**
 * Extrait les mentions (@username) d'un texte
 * @example "cc @cedric @marie" => ["cedric", "marie"]
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  return matches.map((match) => match[1].toLowerCase());
}

/**
 * Calcule la fréquence des termes (Term Frequency)
 * @returns Map<terme, fréquence>
 */
export function calculateTermFrequency(tokens: string[]): Map<string, number> {
  const termFreq = new Map<string, number>();

  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  // Normaliser par le nombre total de tokens
  const total = tokens.length;
  for (const [term, count] of termFreq.entries()) {
    termFreq.set(term, count / total);
  }

  return termFreq;
}

/**
 * Calcule l'IDF (Inverse Document Frequency) pour un corpus
 * IDF(t) = log(N / df(t))
 * où N = nombre total de documents, df(t) = nombre de documents contenant le terme t
 */
export function calculateIDF(
  corpus: string[][],
): Map<string, number> {
  const documentFreq = new Map<string, number>();
  const numDocuments = corpus.length;

  // Compter dans combien de documents chaque terme apparaît
  for (const tokens of corpus) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      documentFreq.set(token, (documentFreq.get(token) || 0) + 1);
    }
  }

  // Calculer IDF
  const idf = new Map<string, number>();
  for (const [term, df] of documentFreq.entries()) {
    idf.set(term, Math.log(numDocuments / df));
  }

  return idf;
}

/**
 * Calcule le vecteur TF-IDF pour un document
 * TF-IDF(t, d) = TF(t, d) * IDF(t)
 */
export function calculateTFIDF(
  tokens: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const tf = calculateTermFrequency(tokens);
  const tfidf = new Map<string, number>();

  for (const [term, tfValue] of tf.entries()) {
    const idfValue = idf.get(term) || 0;
    tfidf.set(term, tfValue * idfValue);
  }

  return tfidf;
}

/**
 * Calcule la magnitude (norme) d'un vecteur
 */
export function calculateMagnitude(vector: Map<string, number>): number {
  let sum = 0;
  for (const value of vector.values()) {
    sum += value * value;
  }
  return Math.sqrt(sum);
}

/**
 * Calcule le produit scalaire de deux vecteurs
 */
export function dotProduct(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
  let product = 0;

  // Itérer sur le plus petit vecteur pour optimisation
  const [smaller, larger] =
    vector1.size < vector2.size ? [vector1, vector2] : [vector2, vector1];

  for (const [term, value1] of smaller.entries()) {
    const value2 = larger.get(term);
    if (value2 !== undefined) {
      product += value1 * value2;
    }
  }

  return product;
}

/**
 * Calcule la similarité cosinus entre deux vecteurs TF-IDF
 * cosine_similarity = (v1 · v2) / (||v1|| * ||v2||)
 * Retourne une valeur entre 0 (aucune similarité) et 1 (identique)
 */
export function cosineSimilarity(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
  const dot = dotProduct(vector1, vector2);
  const magnitude1 = calculateMagnitude(vector1);
  const magnitude2 = calculateMagnitude(vector2);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dot / (magnitude1 * magnitude2);
}

/**
 * Calcule le coefficient de Jaccard entre deux ensembles
 * jaccard = |A ∩ B| / |A ∪ B|
 * Retourne une valeur entre 0 (aucun élément commun) et 1 (identiques)
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}
