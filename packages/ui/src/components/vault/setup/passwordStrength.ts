/**
 * Utilitaires pour évaluer la force d'un mot de passe
 * Session 78 - Phase 2
 */

import { PasswordStrength } from '../types';

/**
 * Évalue la force d'un mot de passe
 *
 * Algorithme inspiré de zxcvbn (Dropbox)
 * Score de 0 (très faible) à 4 (très fort)
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const criteria = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  // Calculer le score basé sur les critères
  let score = 0;
  const suggestions: string[] = [];

  // Longueur (le plus important)
  if (password.length >= 16) {
    score += 2;
  } else if (password.length >= 12) {
    score += 1;
  } else {
    suggestions.push('Utilisez au moins 12 caractères (16+ recommandé)');
  }

  // Diversité des caractères
  const criteriaCount = Object.values(criteria).filter(Boolean).length;
  if (criteriaCount >= 4) {
    score += 2;
  } else if (criteriaCount >= 3) {
    score += 1;
  }

  // Suggestions pour améliorer
  if (!criteria.hasUppercase) {
    suggestions.push('Ajoutez des majuscules');
  }
  if (!criteria.hasLowercase) {
    suggestions.push('Ajoutez des minuscules');
  }
  if (!criteria.hasNumber) {
    suggestions.push('Ajoutez des chiffres');
  }
  if (!criteria.hasSpecial) {
    suggestions.push('Ajoutez des caractères spéciaux (!@#$%^&*)');
  }

  // Détecter patterns faibles
  if (/^(.)\1+$/.test(password)) {
    score = 0;
    suggestions.push('Évitez les répétitions (aaaa, 1111)');
  }

  if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/.test(password.toLowerCase())) {
    score = Math.max(0, score - 1);
    suggestions.push('Évitez les suites (123, abc)');
  }

  if (/^(password|motdepasse|admin|root|user|test|demo)/i.test(password)) {
    score = 0;
    suggestions.push('Évitez les mots communs (password, admin)');
  }

  // Plafonner le score à 4
  score = Math.min(4, score);

  // Déterminer label et couleur
  const labels = ['Très Faible', 'Faible', 'Moyen', 'Fort', 'Très Fort'];
  const colors = ['red', 'orange', 'yellow', 'lightgreen', 'green'];

  return {
    score,
    label: labels[score],
    color: colors[score],
    suggestions,
    criteria,
  };
}

/**
 * Génère un mot de passe aléatoire fort
 *
 * @param length Longueur du mot de passe (défaut: 16)
 * @param options Options de génération
 */
export function generateStrongPassword(
  length: number = 16,
  options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSpecial?: boolean;
  } = {}
): string {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecial = true,
  } = options;

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = '';
  if (includeUppercase) charset += uppercase;
  if (includeLowercase) charset += lowercase;
  if (includeNumbers) charset += numbers;
  if (includeSpecial) charset += special;

  if (charset.length === 0) {
    throw new Error('Au moins un type de caractère doit être inclus');
  }

  // Générer mot de passe avec crypto.getRandomValues (sécurisé)
  const password: string[] = [];
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % charset.length;
    password.push(charset[randomIndex]);
  }

  // Garantir qu'au moins un caractère de chaque type est présent
  const result = password.join('');

  // Vérifier les critères
  const strength = evaluatePasswordStrength(result);
  if (strength.score < 3) {
    // Régénérer si trop faible (rare avec crypto.getRandomValues)
    return generateStrongPassword(length, options);
  }

  return result;
}

/**
 * Estime le temps pour craquer le mot de passe par brute-force
 *
 * @param password Mot de passe à évaluer
 * @returns Temps estimé en format lisible
 */
export function estimateCrackTime(password: string): string {
  // Calculer l'entropie (nombre de possibilités)
  let charset = 0;
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^A-Za-z0-9]/.test(password)) charset += 33;

  const combinations = Math.pow(charset, password.length);

  // Assumer 10 milliards de tentatives par seconde (GPU moderne)
  const attemptsPerSecond = 10_000_000_000;
  const secondsToCrack = combinations / attemptsPerSecond;

  // Convertir en format lisible
  if (secondsToCrack < 1) return 'Instantané';
  if (secondsToCrack < 60) return `${Math.round(secondsToCrack)} secondes`;
  if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
  if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} heures`;
  if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} jours`;
  if (secondsToCrack < 31536000 * 100) {
    return `${Math.round(secondsToCrack / 31536000)} ans`;
  }

  return 'Plusieurs siècles';
}
