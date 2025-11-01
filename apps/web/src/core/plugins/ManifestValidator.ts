/**
 * Manifest Validator
 * Extended validation for plugin manifests with distribution support
 * Phase 4 - Sprint 1
 */

import type { PluginManifest } from '@cartae/plugin-system';
import {
  validateManifestWithDistribution,
  validateDistribution,
  hasDistribution,
  hasIntegritySignature,
  type PluginManifestWithDistribution,
} from './DistributionSchema';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

/**
 * Validate plugin manifest with full distribution support
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic type check
  if (!manifest || typeof manifest !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'manifest', message: 'Manifest must be an object', severity: 'error' }],
      warnings: [],
    };
  }

  const m = manifest as Record<string, unknown>;

  // Validate with Zod schema
  const schemaResult = validateManifestWithDistribution(manifest);

  if (!schemaResult.success) {
    schemaResult.errors?.forEach(error => {
      const [field, ...messageParts] = error.split(':');
      errors.push({
        field: field.trim(),
        message: messageParts.join(':').trim(),
        severity: 'error',
      });
    });
  }

  // Additional custom validations

  // Check if distribution is present but incomplete
  if (hasDistribution(manifest) && m.distribution) {
    const distResult = validateDistribution(m.distribution);
    if (!distResult.success) {
      distResult.errors?.forEach(error => {
        const [field, ...messageParts] = error.split(':');
        errors.push({
          field: `distribution.${field.trim()}`,
          message: messageParts.join(':').trim(),
          severity: 'error',
        });
      });
    }

    // Warn if no integrity signature
    if (!hasIntegritySignature(manifest)) {
      warnings.push({
        field: 'distribution.integrity',
        message: 'No integrity signature found. Plugin should be signed for security.',
        severity: 'warning',
      });
    }

    // Warn if no SBOM
    const dist = m.distribution as Record<string, unknown>;
    if (!dist.sbom) {
      warnings.push({
        field: 'distribution.sbom',
        message:
          'No SBOM (Software Bill of Materials) found. Recommended for supply chain security.',
        severity: 'warning',
      });
    }

    // Warn if using HTTP instead of HTTPS for registry/CDN
    if (dist.registry && typeof dist.registry === 'string' && dist.registry.startsWith('http://')) {
      warnings.push({
        field: 'distribution.registry',
        message: 'Registry URL uses HTTP. HTTPS is strongly recommended for security.',
        severity: 'warning',
      });
    }

    if (dist.cdn && typeof dist.cdn === 'string' && dist.cdn.startsWith('http://')) {
      warnings.push({
        field: 'distribution.cdn',
        message: 'CDN URL uses HTTP. HTTPS is strongly recommended for security.',
        severity: 'warning',
      });
    }
  }

  // Warn about missing recommended fields
  if (!m.icon) {
    warnings.push({
      field: 'icon',
      message: 'No icon specified. An icon improves plugin discoverability.',
      severity: 'warning',
    });
  }

  if (!m.category) {
    warnings.push({
      field: 'category',
      message: 'No category specified. Categorization helps users find your plugin.',
      severity: 'warning',
    });
  }

  if (!m.homepage && !m.repository) {
    warnings.push({
      field: 'homepage',
      message: 'No homepage or repository URL. Consider adding one for user reference.',
      severity: 'warning',
    });
  }

  if (!m.license) {
    warnings.push({
      field: 'license',
      message: 'No license specified. A license clarifies usage terms.',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate manifest for publication (stricter rules)
 */
export function validateForPublication(manifest: unknown): ValidationResult {
  const result = validateManifest(manifest);

  if (!result.valid) {
    return result;
  }

  const m = manifest as Record<string, unknown>;

  // Publication requires distribution config
  if (!hasDistribution(manifest)) {
    result.errors.push({
      field: 'distribution',
      message: 'Distribution configuration is required for publication',
      severity: 'error',
    });
    result.valid = false;
  }

  // Publication requires integrity signature
  if (!hasIntegritySignature(manifest)) {
    result.errors.push({
      field: 'distribution.integrity.sig',
      message: 'Code signature is required for publication',
      severity: 'error',
    });
    result.valid = false;
  }

  // Publication requires license
  if (!m.license) {
    result.errors.push({
      field: 'license',
      message: 'License is required for publication',
      severity: 'error',
    });
    result.valid = false;
  }

  // Publication requires repository or homepage
  if (!m.repository && !m.homepage) {
    result.errors.push({
      field: 'repository',
      message: 'Repository or homepage URL is required for publication',
      severity: 'error',
    });
    result.valid = false;
  }

  return result;
}

/**
 * Validate manifest compatibility with BigMind version
 */
export function validateCompatibility(manifest: PluginManifest, bigmindVersion: string): boolean {
  if (!manifest.bigmindVersion) {
    // No version constraint means compatible with all versions
    return true;
  }

  // Simple semver check (in production, use 'semver' package)
  // For now, just check major version match
  const manifestMajor = manifest.bigmindVersion.match(/\d+/)?.[0];
  const currentMajor = bigmindVersion.match(/\d+/)?.[0];

  return manifestMajor === currentMajor;
}

/**
 * Check if manifest requires payment
 */
export function isPaidPlugin(manifest: PluginManifest): boolean {
  return manifest.pricing === 'paid' || manifest.pricing === 'freemium';
}

/**
 * Get validation summary message
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Manifest is valid with no warnings';
  }

  if (result.valid && result.warnings.length > 0) {
    return `Manifest is valid with ${result.warnings.length} warning(s)`;
  }

  return `Manifest is invalid with ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`;
}

/**
 * Format validation errors and warnings for display
 */
export function formatValidationMessages(result: ValidationResult): string[] {
  const messages: string[] = [];

  result.errors.forEach(error => {
    messages.push(`❌ [${error.field}] ${error.message}`);
  });

  result.warnings.forEach(warning => {
    messages.push(`⚠️  [${warning.field}] ${warning.message}`);
  });

  return messages;
}

/**
 * Validate an array of manifests
 */
export function validateManifests(manifests: unknown[]): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  manifests.forEach(manifest => {
    if (manifest && typeof manifest === 'object' && 'id' in manifest) {
      const m = manifest as { id: string };
      results.set(m.id, validateManifest(manifest));
    }
  });

  return results;
}
