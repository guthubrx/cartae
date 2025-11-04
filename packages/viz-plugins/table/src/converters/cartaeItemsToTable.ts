/**
 * cartaeItemsToTable - Convertit CartaeItems en données tableau
 *
 * NOTES: Version minimale pour Session 40A
 * - Interface UI complète à venir en Session 40C
 * - Pour le moment, c'est juste un placeholder
 */

/**
 * Stub pour conversion (complètement implémentée en Session 40C)
 */
export function cartaeItemsToTable(
  items: any[],
  config: any
): {
  items: any[];
  totalItems: number;
  filteredItems: number;
} {
  return {
    items: items || [],
    totalItems: items?.length || 0,
    filteredItems: items?.length || 0,
  };
}

/**
 * Stub pour export CSV
 */
export function exportToCSV(items: any[]): string {
  return '';
}

/**
 * Stub pour export JSON
 */
export function exportToJSON(items: any[]): string {
  return JSON.stringify(items || []);
}
