/**
 * Mock Plugins Data
 * Données de test pour les E2E tests du Marketplace
 */

export const mockPlugins = [
  {
    id: 'com.cartae.test-plugin-1',
    name: 'Test Color Palette',
    version: '1.0.0',
    description: 'Plugin de test pour les palettes de couleurs',
    author: {
      name: 'Test Team',
      email: 'test@cartae.com',
    },
    category: 'theme',
    tags: ['theme', 'colors', 'palette'],
    source: 'official',
    pricing: 'free',
    featured: true,
    downloads: 1500,
    rating: 4.8,
    numRatings: 45,
    updatedAt: '2025-01-30T10:00:00.000Z',
  },
  {
    id: 'com.cartae.test-plugin-2',
    name: 'Test Tag Manager',
    version: '1.2.0',
    description: 'Plugin de test pour la gestion des tags',
    author: {
      name: 'Test Team',
      email: 'test@cartae.com',
    },
    category: 'productivity',
    tags: ['tags', 'organization', 'productivity'],
    source: 'official',
    pricing: 'free',
    featured: true,
    downloads: 2100,
    rating: 4.9,
    numRatings: 67,
    updatedAt: '2025-01-29T15:00:00.000Z',
  },
  {
    id: 'com.cartae.test-plugin-3',
    name: 'Test Markdown Export',
    version: '2.0.0',
    description: "Plugin de test pour l'export Markdown",
    author: {
      name: 'Community Dev',
      email: 'dev@example.com',
    },
    category: 'export',
    tags: ['export', 'markdown', 'documentation'],
    source: 'community',
    pricing: 'free',
    featured: false,
    downloads: 850,
    rating: 4.5,
    numRatings: 23,
    updatedAt: '2025-01-28T12:00:00.000Z',
  },
  {
    id: 'com.cartae.test-plugin-4',
    name: 'Test AI Assistant',
    version: '1.5.0',
    description: "Plugin de test pour l'assistant IA",
    author: {
      name: 'AI Dev',
      email: 'ai@example.com',
    },
    category: 'ai',
    tags: ['ai', 'openai', 'assistant', 'automation'],
    source: 'community',
    pricing: 'paid',
    featured: false,
    downloads: 320,
    rating: 4.2,
    numRatings: 8,
    updatedAt: '2025-01-27T09:00:00.000Z',
  },
  {
    id: 'com.cartae.test-plugin-5',
    name: 'Test Graph Visualizer',
    version: '3.1.0',
    description: 'Plugin de test pour la visualisation de graphes',
    author: {
      name: 'Viz Team',
      email: 'viz@cartae.com',
    },
    category: 'productivity',
    tags: ['visualization', 'graph', 'analysis'],
    source: 'official',
    pricing: 'free',
    featured: false,
    downloads: 650,
    rating: 4.6,
    numRatings: 18,
    updatedAt: '2025-01-26T14:00:00.000Z',
  },
];

export const mockPluginListResponse = {
  data: mockPlugins,
  pagination: {
    page: 1,
    limit: 20,
    total: 5,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

export const mockFeaturedPlugins = {
  data: mockPlugins.filter(p => p.featured),
};

export const mockTrendingPlugins = {
  data: [...mockPlugins].sort((a, b) => b.downloads - a.downloads).slice(0, 3),
};

export const mockSearchResults = (query: string) => {
  const filtered = mockPlugins.filter(
    p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );

  return {
    query,
    results: filtered,
    total: filtered.length,
  };
};

export const mockCategoryFilter = (category: string) => {
  const filtered = mockPlugins.filter(p => p.category === category);

  return {
    data: filtered,
    category,
  };
};
