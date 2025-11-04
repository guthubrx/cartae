/**
 * Color Palettes Collection Plugin
 * Provides 41 color palettes for nodes and tags
 */

import type { IPluginContext, PluginManifest } from '@cartae/plugin-system';
import {
  registerPalettes,
  unregisterPalette,
  type ColorPalette,
} from '../../../themes/colorPalettes';

// FR: Collection complète de 41 palettes de couleurs
// EN: Complete collection of 41 color palettes
const COLOR_PALETTES_COLLECTION: ColorPalette[] = [
  // Palette par défaut (anciennement dans le core)
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Couleurs vives et énergiques',
    colors: [
      '#3b82f6', // Blue
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#ef4444', // Red
      '#f59e0b', // Orange
      '#eab308', // Yellow
      '#84cc16', // Lime
      '#10b981', // Green
      '#14b8a6', // Teal
      '#06b6d4', // Cyan
    ],
    // FR: Variantes pour light/dark (comme Obsidian)
    // EN: Variants for light/dark (like Obsidian)
    variants: {
      light: [
        '#3b82f6', // Blue - plus vif pour light
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#ef4444', // Red
        '#f59e0b', // Orange
        '#eab308', // Yellow
        '#84cc16', // Lime
        '#10b981', // Green
        '#14b8a6', // Teal
        '#06b6d4', // Cyan
      ],
      dark: [
        '#60a5fa', // Blue - plus clair pour dark
        '#a78bfa', // Purple - plus clair
        '#f472b6', // Pink - plus clair
        '#f87171', // Red - plus clair
        '#fb923c', // Orange - plus clair
        '#fbbf24', // Yellow - plus clair
        '#a3e635', // Lime - plus clair
        '#34d399', // Green - plus clair
        '#2dd4bf', // Teal - plus clair
        '#22d3ee', // Cyan - plus clair
      ],
    },
    // FR: Fond de carte adaptatif selon le thème
    // EN: Adaptive canvas background based on theme
    canvasBackground: {
      light: '#ffffff', // Fond blanc pour light
      dark: '#1e293b', // Fond sombre pour dark (cohérent avec le thème)
    },
  },

  // 7 Palettes essentielles
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Couleurs douces et apaisantes',
    colors: [
      '#93c5fd',
      '#c4b5fd',
      '#f9a8d4',
      '#fca5a5',
      '#fdba74',
      '#fde047',
      '#bef264',
      '#86efac',
      '#5eead4',
      '#67e8f9',
    ],
  },

  {
    id: 'earth',
    name: 'Earth',
    description: 'Tons naturels et terreux',
    colors: [
      '#92400e',
      '#78350f',
      '#854d0e',
      '#713f12',
      '#365314',
      '#14532d',
      '#064e3b',
      '#134e4a',
      '#1e3a8a',
      '#1e40af',
    ],
  },

  {
    id: 'neon',
    name: 'Neon',
    description: 'Couleurs électriques et lumineuses',
    colors: [
      '#22d3ee',
      '#a78bfa',
      '#f472b6',
      '#fb923c',
      '#facc15',
      '#4ade80',
      '#2dd4bf',
      '#60a5fa',
      '#c084fc',
      '#fb7185',
    ],
  },

  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Nuances de bleu et de vert',
    colors: [
      '#0c4a6e',
      '#075985',
      '#0369a1',
      '#0891b2',
      '#0d9488',
      '#059669',
      '#047857',
      '#065f46',
      '#134e4a',
      '#164e63',
    ],
  },

  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Arc-en-ciel complet',
    colors: [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#eab308',
      '#84cc16',
      '#10b981',
      '#06b6d4',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
    ],
  },

  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Nuances de gris',
    colors: [
      '#0f172a',
      '#1e293b',
      '#334155',
      '#475569',
      '#64748b',
      '#94a3b8',
      '#cbd5e1',
      '#e2e8f0',
      '#f1f5f9',
      '#f8fafc',
    ],
  },

  {
    id: 'material',
    name: 'Material',
    description: 'Palette Material Design',
    colors: [
      '#f44336',
      '#e91e63',
      '#9c27b0',
      '#673ab7',
      '#3f51b5',
      '#2196f3',
      '#00bcd4',
      '#4caf50',
      '#ff9800',
      '#795548',
    ],
  },

  // 33 Palettes étendues
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Couleurs chaudes du coucher de soleil',
    colors: [
      '#7c2d12',
      '#991b1b',
      '#9a3412',
      '#c2410c',
      '#d97706',
      '#ca8a04',
      '#a16207',
      '#854d0e',
      '#78350f',
      '#713f12',
    ],
  },

  {
    id: 'forest',
    name: 'Forest',
    description: 'Verts de la forêt',
    colors: [
      '#14532d',
      '#166534',
      '#15803d',
      '#16a34a',
      '#22c55e',
      '#4ade80',
      '#86efac',
      '#bbf7d0',
      '#84cc16',
      '#65a30d',
    ],
  },

  {
    id: 'berry',
    name: 'Berry',
    description: 'Tons de baies et de fruits',
    colors: [
      '#881337',
      '#9f1239',
      '#be123c',
      '#db2777',
      '#ec4899',
      '#f472b6',
      '#a21caf',
      '#c026d3',
      '#d946ef',
      '#e879f9',
    ],
  },

  {
    id: 'autumn',
    name: 'Autumn',
    description: 'Couleurs automnales',
    colors: [
      '#7c2d12',
      '#9a3412',
      '#c2410c',
      '#ea580c',
      '#dc2626',
      '#b91c1c',
      '#92400e',
      '#78350f',
      '#854d0e',
      '#a16207',
    ],
  },

  {
    id: 'spring',
    name: 'Spring',
    description: 'Couleurs printanières',
    colors: [
      '#fef3c7',
      '#fde68a',
      '#fcd34d',
      '#bbf7d0',
      '#86efac',
      '#4ade80',
      '#f9a8d4',
      '#f472b6',
      '#c4b5fd',
      '#a78bfa',
    ],
  },

  {
    id: 'flatui',
    name: 'Flat UI',
    description: 'Couleurs du design Flat UI',
    colors: [
      '#1abc9c',
      '#2ecc71',
      '#3498db',
      '#9b59b6',
      '#34495e',
      '#f1c40f',
      '#e67e22',
      '#e74c3c',
      '#ecf0f1',
      '#95a5a6',
    ],
  },

  {
    id: 'nordic',
    name: 'Nordic',
    description: 'Tons scandinaves froids et élégants',
    colors: [
      '#2e3440',
      '#3b4252',
      '#434c5e',
      '#4c566a',
      '#d8dee9',
      '#e5e9f0',
      '#eceff4',
      '#8fbcbb',
      '#88c0d0',
      '#5e81ac',
    ],
  },

  {
    id: 'warm',
    name: 'Warm',
    description: 'Palette de tons chauds',
    colors: [
      '#ff6b6b',
      '#ee5a6f',
      '#f06595',
      '#ff8787',
      '#ffa94d',
      '#ffd43b',
      '#fab005',
      '#fd7e14',
      '#ff922b',
      '#fa5252',
    ],
  },

  {
    id: 'cool',
    name: 'Cool',
    description: 'Palette de tons froids',
    colors: [
      '#339af0',
      '#4dabf7',
      '#74c0fc',
      '#22b8cf',
      '#15aabf',
      '#12b886',
      '#20c997',
      '#51cf66',
      '#94d82d',
      '#a9e34b',
    ],
  },

  {
    id: 'tropical',
    name: 'Tropical',
    description: 'Couleurs vives tropicales',
    colors: [
      '#fd79a8',
      '#fdcb6e',
      '#6c5ce7',
      '#00b894',
      '#00cec9',
      '#0984e3',
      '#a29bfe',
      '#fab1a0',
      '#ff7675',
      '#ffeaa7',
    ],
  },

  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Couleurs rétro et vintage',
    colors: [
      '#d4a574',
      '#c19a6b',
      '#8b7355',
      '#a0826d',
      '#b4846c',
      '#c9a882',
      '#9c7a66',
      '#8b6f47',
      '#704214',
      '#8b4513',
    ],
  },

  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Couleurs professionnelles pour le business',
    colors: [
      '#1e3a8a',
      '#1e40af',
      '#1d4ed8',
      '#3b82f6',
      '#0f766e',
      '#047857',
      '#dc2626',
      '#d97706',
      '#4b5563',
      '#1f2937',
    ],
  },

  {
    id: 'candy',
    name: 'Candy',
    description: 'Couleurs sucrées et acidulées',
    colors: [
      '#fbbf24',
      '#fb923c',
      '#f472b6',
      '#c084fc',
      '#a78bfa',
      '#60a5fa',
      '#38bdf8',
      '#2dd4bf',
      '#34d399',
      '#fde047',
    ],
  },

  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Thème sombre populaire avec accents vifs',
    colors: [
      '#ff5555',
      '#ffb86c',
      '#f1fa8c',
      '#50fa7b',
      '#8be9fd',
      '#bd93f9',
      '#ff79c6',
      '#6272a4',
      '#44475a',
      '#282a36',
    ],
  },

  {
    id: 'nord',
    name: 'Nord',
    description: 'Palette arctique inspirée du nord',
    colors: [
      '#bf616a',
      '#d08770',
      '#ebcb8b',
      '#a3be8c',
      '#88c0d0',
      '#81a1c1',
      '#5e81ac',
      '#b48ead',
      '#8fbcbb',
      '#4c566a',
    ],
  },

  {
    id: 'catppuccin',
    name: 'Catppuccin',
    description: 'Thème pastel apaisant',
    colors: [
      '#dc8a78',
      '#dd7878',
      '#ea76cb',
      '#8839ef',
      '#d20f39',
      '#e64553',
      '#fe640b',
      '#df8e1d',
      '#40a02b',
      '#1e66f5',
    ],
  },

  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Palette de précision pour machines et personnes',
    colors: [
      '#dc322f',
      '#cb4b16',
      '#b58900',
      '#859900',
      '#2aa198',
      '#268bd2',
      '#6c71c4',
      '#d33682',
      '#073642',
      '#002b36',
    ],
  },

  {
    id: 'tokyonight',
    name: 'Tokyo Night',
    description: 'Lumières du centre-ville de Tokyo la nuit',
    colors: [
      '#f7768e',
      '#ff9e64',
      '#e0af68',
      '#9ece6a',
      '#73daca',
      '#7aa2f7',
      '#7dcfff',
      '#bb9af7',
      '#c0caf5',
      '#1a1b26',
    ],
  },

  {
    id: 'onedark',
    name: 'One Dark',
    description: "Thème sombre iconique d'Atom",
    colors: [
      '#e06c75',
      '#d19a66',
      '#e5c07b',
      '#98c379',
      '#56b6c2',
      '#61afef',
      '#c678dd',
      '#be5046',
      '#abb2bf',
      '#282c34',
    ],
  },

  {
    id: 'synthwave',
    name: 'Synthwave',
    description: 'Néon rétro des années 80',
    colors: [
      '#ff00ff',
      '#00ffff',
      '#ff2975',
      '#f222ff',
      '#8c1eff',
      '#ff901f',
      '#ffd319',
      '#9400d3',
      '#ff4500',
      '#ffd700',
    ],
  },

  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futur dystopique néon',
    colors: [
      '#00ff9f',
      '#00b8ff',
      '#ff00ff',
      '#ff5c8a',
      '#bd00ff',
      '#d600ff',
      '#ffd700',
      '#ff4500',
      '#00ffff',
      '#070f34',
    ],
  },

  {
    id: 'vaporwave',
    name: 'Vaporwave',
    description: 'Esthétique rétro-futuriste',
    colors: [
      '#ff71ce',
      '#01cdfe',
      '#05ffa1',
      '#b967ff',
      '#fffb96',
      '#ff6c11',
      '#ff10f0',
      '#00e0ff',
      '#ff90e8',
      '#fdff6a',
    ],
  },

  {
    id: 'retro60s',
    name: 'Retro 60s',
    description: 'Couleurs psychédéliques des années 60',
    colors: [
      '#c681cc',
      '#cc6933',
      '#d3be47',
      '#a9d33e',
      '#508fba',
      '#e86f68',
      '#83b799',
      '#c2b28f',
      '#fb2e01',
      '#6fcb9f',
    ],
  },

  {
    id: 'retro70s',
    name: 'Retro 70s',
    description: 'Tons terreux des années 70',
    colors: [
      '#722880',
      '#d72d51',
      '#eb5c18',
      '#f08800',
      '#deb600',
      '#a68b5b',
      '#8b7d6b',
      '#7c6a4f',
      '#c19a6b',
      '#556b2f',
    ],
  },

  {
    id: 'retro80s',
    name: 'Retro 80s',
    description: 'Néon électrique des années 80',
    colors: [
      '#2cceff',
      '#f80cd5',
      '#8ce411',
      '#f7e11c',
      '#f52909',
      '#ff6ec7',
      '#00ffcc',
      '#ffff00',
      '#ff00ff',
      '#00ff00',
    ],
  },

  {
    id: 'outrun',
    name: 'Outrun',
    description: 'Coucher de soleil synthwave',
    colors: [
      '#ff0090',
      '#ff4500',
      '#ff8c00',
      '#ffd700',
      '#fc0fc0',
      '#2de2e6',
      '#f000ff',
      '#ff6ec7',
      '#00ffff',
      '#ffff00',
    ],
  },

  {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Rétro groove aux tons chauds',
    colors: [
      '#cc241d',
      '#d79921',
      '#98971a',
      '#458588',
      '#b16286',
      '#d65d0e',
      '#689d6a',
      '#fe8019',
      '#fb4934',
      '#fabd2f',
    ],
  },

  {
    id: 'rose',
    name: 'Rosé Pine',
    description: 'Tons roses doux et élégants',
    colors: [
      '#eb6f92',
      '#f6c177',
      '#ebbcba',
      '#31748f',
      '#9ccfd8',
      '#c4a7e7',
      '#e0def4',
      '#6e6a86',
      '#908caa',
      '#191724',
    ],
  },

  {
    id: 'github',
    name: 'GitHub',
    description: 'Couleurs officielles de GitHub',
    colors: [
      '#f85149',
      '#fb8500',
      '#d29922',
      '#3fb950',
      '#1f6feb',
      '#a371f7',
      '#bc4c00',
      '#58a6ff',
      '#8957e5',
      '#0d1117',
    ],
  },

  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Palette Monokai classique',
    colors: [
      '#f92672',
      '#fd971f',
      '#e6db74',
      '#a6e22e',
      '#66d9ef',
      '#ae81ff',
      '#f8f8f2',
      '#75715e',
      '#49483e',
      '#272822',
    ],
  },

  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Thème chaud et vibrant',
    colors: [
      '#e95678',
      '#fab795',
      '#fac29a',
      '#09f7a0',
      '#25b0bc',
      '#59e3e3',
      '#6c6f93',
      '#b877db',
      '#f09483',
      '#21bfc2',
    ],
  },

  {
    id: 'ayu',
    name: 'Ayu',
    description: 'Palette moderne et claire',
    colors: [
      '#f07178',
      '#ffaa33',
      '#ffee99',
      '#b8cc52',
      '#95e6cb',
      '#59c2ff',
      '#d4bfff',
      '#f29e74',
      '#39bae6',
      '#0a0e14',
    ],
  },
];

export const manifest: PluginManifest = {
  id: 'com.bigmind.color-palettes-collection',
  name: 'Color Palettes Collection',
  version: '1.0.0',
  description: '41 palettes de couleurs professionnelles pour sublimer vos mind maps',
  /* eslint-disable max-len */
  longDescription: `Transformez l'apparence de vos cartes mentales avec notre collection exclusive de 41 palettes de couleurs soigneusement sélectionnées. Des classiques intemporels aux thèmes modernes de développeurs, en passant par les styles rétro et les ambiances naturelles.

**Pourquoi ce plugin est essentiel ?**

Chaque palette a été conçue pour maximiser la lisibilité et l'impact visuel de vos idées. Que vous créiez une présentation professionnelle, organisiez un brainstorming créatif ou structuriez un projet technique, vous trouverez la palette parfaite pour votre contexte.`,
  /* eslint-enable max-len */
  author: {
    name: 'BigMind Team',
    email: 'team@bigmind.com',
  },
  main: 'color-palettes-collection-plugin.js',

  // Visual identity
  icon: '🎨',
  logo: '/assets/plugin-logos/color-palettes-collection.svg',
  color: '#8B5CF6',

  // Classification
  category: 'theme',
  tags: ['colors', 'palettes', 'theme', 'design', 'productivity'],
  source: 'official',
  pricing: 'free',
  featured: true,
  autoActivate: true, // Auto-activate on first launch (essential for colors)

  license: 'MIT',
  bigmindVersion: '1.0.0',

  // Marketing
  tagline: 'Des couleurs parfaites pour chaque contexte',
  benefits: [
    "41 palettes professionnelles prêtes à l'emploi",
    'Thèmes populaires de développeurs (Dracula, Nord, Tokyo Night...)',
    'Styles vintage et rétro (60s, 70s, 80s, Synthwave)',
    'Harmonies naturelles et thématiques',
    'Compatibilité garantie avec tous vos projets',
  ],
  useCases: [
    'Présentations professionnelles avec palette Corporate ou Material',
    'Brainstorming créatif avec palettes Vibrant ou Tropical',
    'Documentation technique avec thèmes de code (Monokai, Gruvbox)',
    'Projets personnels avec styles Pastel ou Vintage',
  ],

  // Features
  features: [
    {
      label: '41 Palettes complètes',
      description: 'Collection complète : essentielles + étendues + thèmes populaires',
      icon: '🌈',
    },
    {
      label: 'Thèmes de code',
      description: 'Dracula, Nord, Solarized, Tokyo Night, Gruvbox, Monokai, etc.',
      icon: '⭐',
    },
    {
      label: 'Styles rétro',
      description: 'Années 60s, 70s, 80s, Synthwave, Vaporwave, Cyberpunk',
      icon: '🕹️',
    },
    {
      label: 'Thématiques variées',
      description: 'Pastel, Earth, Neon, Ocean, Sunset, Forest, Tropical, etc.',
      icon: '🎯',
    },
  ],

  // Changelog
  changelog: [
    {
      version: '1.0.0',
      date: '2025-01-28',
      changes: [
        {
          type: 'added',
          description: 'Collection complète de 41 palettes de couleurs',
        },
        {
          type: 'added',
          description:
            '8 palettes essentielles (Vibrant, Pastel, Earth, Neon, ' +
            'Ocean, Rainbow, Monochrome, Material)',
        },
        {
          type: 'added',
          description: '33 palettes étendues (thèmes de code, rétro, thématiques)',
        },
      ],
    },
  ],

  // Hooks
  hooks: {
    listens: [],
    emits: [],
  },

  // UI Contributions
  uiContributions: {
    commands: [],
    menus: [],
    panels: [],
    settings: false,
  },

  permissions: [],
};

export async function activate(_context: IPluginContext): Promise<void> {
  // Register all color palettes
  registerPalettes(COLOR_PALETTES_COLLECTION);
}

export async function deactivate(): Promise<void> {
  // Unregister all palettes
  COLOR_PALETTES_COLLECTION.forEach(palette => {
    unregisterPalette(palette.id);
  });
}
