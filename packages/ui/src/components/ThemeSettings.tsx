import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { Theme, ThemeCategory } from '@cartae/design';

/**
 * FR: Composant Settings pour gérer les thèmes UI
 * EN: Settings component to manage UI themes
 */
export const ThemeSettings: React.FC = () => {
  const {
    currentTheme,
    availableThemes,
    customThemes,
    isLoading,
    changeTheme,
    addCustomTheme,
    removeCustomTheme,
  } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('light');
  const [showCustomThemeForm, setShowCustomThemeForm] = useState(false);

  // FR: Filtrer les thèmes par catégorie
  // EN: Filter themes by category
  const filteredThemes = [...availableThemes, ...customThemes].filter(
    theme => theme.category === selectedCategory
  );

  // FR: Gérer la création d'un thème personnalisé
  // EN: Handle custom theme creation
  const handleCreateCustomTheme = (themeData: Partial<Theme>) => {
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: themeData.name || 'Custom Theme',
      description: themeData.description || 'Theme personnalisé',
      author: 'User',
      version: '1.0.0',
      category: themeData.category || 'custom',
      colors: {
        primary: themeData.colors?.primary || '#3b82f6',
        secondary: themeData.colors?.secondary || '#64748b',
        accent: themeData.colors?.accent || '#8b5cf6',
        background: themeData.colors?.background || '#ffffff',
        surface: themeData.colors?.surface || '#f8fafc',
        text: themeData.colors?.text || '#1e293b',
        textMuted: themeData.colors?.textMuted || '#64748b',
        border: themeData.colors?.border || '#e2e8f0',
        success: themeData.colors?.success || '#10b981',
        warning: themeData.colors?.warning || '#f59e0b',
        error: themeData.colors?.error || '#ef4444',
        info: themeData.colors?.info || '#3b82f6',
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    addCustomTheme(newTheme);
    setShowCustomThemeForm(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* FR: En-tête */}
      {/* EN: Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Thèmes UI
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Personnalisez l'apparence de votre interface
        </p>
      </div>

      {/* FR: Thème actuel */}
      {/* EN: Current theme */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Thème actuel
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700 dark:text-gray-300">
              {[...availableThemes, ...customThemes].find(t => t.id === currentTheme)?.name || 'Default'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {[...availableThemes, ...customThemes].find(t => t.id === currentTheme)?.description}
            </p>
          </div>
          <div className="flex space-x-2">
            {[...availableThemes, ...customThemes].find(t => t.id === currentTheme)?.isCustom && (
              <button
                onClick={() => removeCustomTheme(currentTheme)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FR: Filtres de catégorie */}
      {/* EN: Category filters */}
      <div className="flex space-x-2">
        {(['light', 'dark', 'high-contrast', 'custom'] as ThemeCategory[]).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {category === 'light' && 'Clair'}
            {category === 'dark' && 'Sombre'}
            {category === 'high-contrast' && 'Contraste élevé'}
            {category === 'custom' && 'Personnalisés'}
          </button>
        ))}
      </div>

      {/* FR: Liste des thèmes */}
      {/* EN: Theme list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThemes.map(theme => (
          <div
            key={theme.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              currentTheme === theme.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
            onClick={() => changeTheme(theme.id)}
          >
            {/* FR: Aperçu des couleurs */}
            {/* EN: Color preview */}
            <div className="flex h-16 mb-3 rounded-lg overflow-hidden">
              {[
                theme.colors.primary,
                theme.colors.secondary,
                theme.colors.accent,
                theme.colors.background,
                theme.colors.surface,
              ].map((color, index) => (
                <div
                  key={index}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {theme.name}
                </h4>
                {theme.isCustom && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                    Personnalisé
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {theme.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Par {theme.author}</span>
                <span>v{theme.version}</span>
              </div>
            </div>

            {/* FR: Actions pour les thèmes personnalisés */}
            {/* EN: Actions for custom themes */}
            {theme.isCustom && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomTheme(theme.id);
                  }}
                  className="w-full px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded transition-colors"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FR: Bouton pour créer un thème personnalisé */}
      {/* EN: Button to create custom theme */}
      {selectedCategory === 'custom' && (
        <div className="text-center">
          {!showCustomThemeForm ? (
            <button
              onClick={() => setShowCustomThemeForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Créer un thème personnalisé
            </button>
          ) : (
            <CustomThemeForm
              onSubmit={handleCreateCustomTheme}
              onCancel={() => setShowCustomThemeForm(false)}
            />
          )}
        </div>
      )}

      {/* FR: Message si aucun thème */}
      {/* EN: Message if no themes */}
      {filteredThemes.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Aucun thème disponible dans cette catégorie.</p>
        </div>
      )}
    </div>
  );
};

// FR: Formulaire pour créer un thème personnalisé
// EN: Form to create custom theme
interface CustomThemeFormProps {
  onSubmit: (themeData: Partial<Theme>) => void;
  onCancel: () => void;
}

const CustomThemeForm: React.FC<CustomThemeFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      category: 'custom',
      colors: {
        primary: formData.primaryColor,
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: formData.backgroundColor,
        surface: '#f8fafc',
        text: formData.textColor,
        textMuted: '#64748b',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Créer un thème personnalisé
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nom du thème
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Mon thème personnalisé"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Description de mon thème..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Couleur principale
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded"
            />
            <input
              type="text"
              value={formData.primaryColor}
              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Arrière-plan
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={formData.backgroundColor}
              onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded"
            />
            <input
              type="text"
              value={formData.backgroundColor}
              onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Couleur du texte
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={formData.textColor}
              onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded"
            />
            <input
              type="text"
              value={formData.textColor}
              onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="#1e293b"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          Créer le thème
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};