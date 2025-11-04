import React, { useState, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
  POPULAR_THEMES,
  filterThemesByCategory,
  getMostPopularThemes,
  getHighestRatedThemes,
  MarketplaceTheme,
} from '../data/theme-marketplace';
import { validateThemeCSS } from '../utils/theme-validator';

/**
 * FR: Page Marketplace pour les thèmes UI
 * EN: Theme Marketplace page
 */
export const ThemeMarketplace: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { addCustomTheme, changeTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'light' | 'dark' | 'popular' | 'rated'
  >('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [installMessage, setInstallMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // FR: Filtrer les thèmes selon la sélection
  // EN: Filter themes based on selection
  const getFilteredThemes = useCallback(() => {
    let themes: MarketplaceTheme[] = [];

    switch (selectedCategory) {
      case 'light':
        themes = filterThemesByCategory('light');
        break;
      case 'dark':
        themes = filterThemesByCategory('dark');
        break;
      case 'popular':
        themes = getMostPopularThemes(15);
        break;
      case 'rated':
        themes = getHighestRatedThemes(15);
        break;
      case 'all':
      default:
        themes = POPULAR_THEMES;
    }

    // FR: Filtrer par recherche si présente
    // EN: Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      themes = themes.filter(
        (theme) =>
          theme.name.toLowerCase().includes(query) ||
          theme.author.toLowerCase().includes(query) ||
          theme.description.toLowerCase().includes(query)
      );
    }

    return themes;
  }, [selectedCategory, searchQuery]);

  const filteredThemes = getFilteredThemes();

  // FR: Télécharger et installer un thème
  // EN: Download and install a theme
  const handleInstallTheme = useCallback(
    async (theme: MarketplaceTheme) => {
      try {
        setIsInstalling(theme.id);
        setInstallMessage(null);

        // Télécharger le CSS
        const response = await fetch(theme.cssUrl);
        if (!response.ok) {
          throw new Error(`Erreur de téléchargement: ${response.statusText}`);
        }

        const cssContent = await response.text();

        // Valider le CSS
        const validation = validateThemeCSS(cssContent);
        if (!validation.valid) {
          const errors = validation.errors.join(', ');
          throw new Error(`CSS invalide: ${errors}`);
        }

        // Afficher les warnings mais continuer
        if (validation.warnings.length > 0) {
          console.warn('Avertissements thème:', validation.warnings);
        }

        // Créer le thème personnalisé
        const customTheme = {
          ...theme,
          id: `marketplace-${theme.id}-${Date.now()}`,
          isCustom: true,
          createdAt: new Date().toISOString(),
        };

        // Ajouter le thème
        addCustomTheme(customTheme);

        // Afficher le message de succès
        setInstallMessage({
          type: 'success',
          text: `${theme.name} installé avec succès! ✨`,
        });

        // Cacher le message après 3 secondes
        setTimeout(() => setInstallMessage(null), 3000);
      } catch (error) {
        console.error('Erreur installation thème:', error);
        setInstallMessage({
          type: 'error',
          text: `Erreur: ${error instanceof Error ? error.message : 'Installation échouée'}`,
        });
      } finally {
        setIsInstalling(null);
      }
    },
    [addCustomTheme]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* FR: En-tête */}
        {/* EN: Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Marketplace Thèmes
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Découvrez et installez {POPULAR_THEMES.length}+ thèmes populaires d'Obsidian
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>

        {/* FR: Barre de recherche */}
        {/* EN: Search bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un thème ou un auteur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* FR: Filtres de catégorie */}
        {/* EN: Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(
            [
              { id: 'popular', label: '🔥 Populaires' },
              { id: 'rated', label: '⭐ Mieux notés' },
              { id: 'light', label: '☀️ Clairs' },
              { id: 'dark', label: '🌙 Sombres' },
              { id: 'all', label: '📚 Tous' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* FR: Message d'installation */}
        {/* EN: Installation message */}
        {installMessage && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              installMessage.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
            }`}
          >
            {installMessage.text}
          </div>
        )}

        {/* FR: Galerie de thèmes */}
        {/* EN: Theme gallery */}
        {filteredThemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isInstalling={isInstalling === theme.id}
                onInstall={() => handleInstallTheme(theme)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Aucun thème trouvé correspondant à votre recherche.
            </p>
          </div>
        )}

        {/* FR: Compteur de résultats */}
        {/* EN: Result counter */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {filteredThemes.length} thème(s) trouvé(s)
        </div>
      </div>
    </div>
  );
};

/**
 * FR: Carte individuelle pour un thème
 * EN: Individual theme card
 */
interface ThemeCardProps {
  theme: MarketplaceTheme;
  isInstalling: boolean;
  onInstall: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isInstalling, onInstall }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* FR: Aperçu des couleurs */}
      {/* EN: Color preview */}
      <div className="flex h-24 bg-gradient-to-r">
        {[
          theme.colors.primary,
          theme.colors.secondary,
          theme.colors.accent,
          theme.colors.success,
          theme.colors.error,
        ].map((color, idx) => (
          <div
            key={idx}
            className="flex-1"
            style={{ backgroundColor: color }}
            title={`Couleur ${idx + 1}`}
          />
        ))}
      </div>

      {/* FR: Contenu de la carte */}
      {/* EN: Card content */}
      <div className="p-4 space-y-3">
        {/* Titre et badges */}
        <div>
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {theme.name}
            </h3>
            {theme.category === 'dark' && (
              <span className="text-lg">🌙</span>
            )}
            {theme.category === 'light' && (
              <span className="text-lg">☀️</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Par {theme.author}</p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {theme.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {theme.downloads && (
            <div className="flex items-center gap-1">
              <span>📥</span>
              <span>{(theme.downloads / 1000).toFixed(0)}k téléchargements</span>
            </div>
          )}
          {theme.rating && (
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span>{theme.rating.toFixed(1)}/5</span>
            </div>
          )}
        </div>

        {/* Bouton d'installation */}
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
            isInstalling
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isInstalling ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚙️</span> Installation...
            </span>
          ) : (
            '📥 Installer'
          )}
        </button>
      </div>
    </div>
  );
};
