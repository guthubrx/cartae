/**
 * Recommendations Engine Tests (Session 60B)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationService } from '../src/services/RecommendationService';
import type { PluginListing } from '../src/types';

const mockPlugins: PluginListing[] = [
  {
    id: 'plugin-1',
    name: 'React UI Components',
    description: 'A collection of reusable React UI components',
    category: 'ui',
    tags: ['react', 'components', 'ui'],
    version: '1.0.0',
    downloads: 5000,
    rating: 4.5,
    updatedAt: '2024-01-15',
    size: 102400,
    pricing: 'free',
    author: 'React Team',
    verified: true,
  },
  {
    id: 'plugin-2',
    name: 'Vue UI Library',
    description: 'Beautiful Vue components for modern applications',
    category: 'ui',
    tags: ['vue', 'components', 'ui'],
    version: '2.1.0',
    downloads: 3000,
    rating: 4.2,
    updatedAt: '2024-01-10',
    size: 204800,
    pricing: 'free',
    author: 'Vue Team',
    verified: true,
  },
  {
    id: 'plugin-3',
    name: 'TypeScript Utilities',
    description: 'Useful TypeScript utilities for development',
    category: 'developer',
    tags: ['typescript', 'utilities', 'developer'],
    version: '1.2.0',
    downloads: 8000,
    rating: 4.8,
    updatedAt: '2024-01-20',
    size: 51200,
    pricing: 'free',
    author: 'TypeScript Team',
    verified: true,
  },
  {
    id: 'plugin-4',
    name: 'React Form Builder',
    description: 'Advanced form builder for React applications',
    category: 'ui',
    tags: ['react', 'forms', 'builder', 'ui'],
    version: '1.1.0',
    downloads: 2500,
    rating: 4.3,
    updatedAt: '2024-01-12',
    size: 153600,
    pricing: 'premium',
    author: 'Form Team',
    verified: false,
  },
  {
    id: 'plugin-5',
    name: 'Node.js Utilities',
    description: 'Essential utilities for Node.js development',
    category: 'backend',
    tags: ['nodejs', 'utilities', 'backend'],
    version: '1.0.5',
    downloads: 6000,
    rating: 4.6,
    updatedAt: '2024-01-18',
    size: 76800,
    pricing: 'free',
    author: 'Node Team',
    verified: true,
  },
];

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;

  beforeEach(() => {
    recommendationService = RecommendationService.getInstance();
    recommendationService.clearCache();
  });

  it('should get similar plugins based on category and tags', () => {
    const targetPlugin = mockPlugins[0]; // React UI Components
    const similarPlugins = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, {
      maxResults: 3,
    });

    expect(similarPlugins).toHaveLength(3);
    expect(similarPlugins[0].id).toBe('plugin-4'); // React Form Builder (most similar)
    expect(similarPlugins[1].id).toBe('plugin-2'); // Vue UI Library (same category)
    expect(similarPlugins[0].category).toBe('ui');
  });

  it('should get cross-sell plugins', () => {
    const targetPlugin = mockPlugins[0]; // React UI Components
    const crossSellPlugins = recommendationService.getCrossSellPlugins(
      targetPlugin,
      mockPlugins,
      2
    );

    expect(crossSellPlugins).toHaveLength(2);
    expect(crossSellPlugins[0].category).toBe('ui');
  });

  it('should get trending plugins', () => {
    const trendingPlugins = recommendationService.getTrendingPlugins(mockPlugins, 3);

    expect(trendingPlugins).toHaveLength(3);
    // Should include plugins with downloads > 100
    expect(trendingPlugins[0].downloads).toBeGreaterThan(100);
  });

  it('should use cache for repeated requests', () => {
    const targetPlugin = mockPlugins[0];
    const options = { maxResults: 2 };

    const firstCall = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, options);

    const secondCall = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, options);

    expect(firstCall).toEqual(secondCall);
  });

  it('should handle empty plugin list gracefully', () => {
    const targetPlugin = mockPlugins[0];
    const similarPlugins = recommendationService.getSimilarPlugins(targetPlugin, [], {
      maxResults: 3,
    });

    expect(similarPlugins).toHaveLength(0);
  });

  it('should exclude target plugin from recommendations', () => {
    const targetPlugin = mockPlugins[0];
    const similarPlugins = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, {
      maxResults: 5,
    });

    const targetInResults = similarPlugins.some(p => p.id === targetPlugin.id);
    expect(targetInResults).toBe(false);
  });

  it('should respect similarity threshold', () => {
    const targetPlugin = mockPlugins[0]; // React UI Components
    const similarPlugins = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, {
      similarityThreshold: 0.8,
      maxResults: 5,
    });

    // With high threshold, should get fewer results
    expect(similarPlugins.length).toBeLessThanOrEqual(2);
  });

  it('should calculate similarity scores correctly', () => {
    const pluginA = mockPlugins[0]; // React UI Components
    const pluginB = mockPlugins[3]; // React Form Builder
    const pluginC = mockPlugins[2]; // TypeScript Utilities

    // Plugin A and B should have higher similarity than A and C
    const similarityAB = recommendationService['calculateSimilarityScore'](pluginA, pluginB);
    const similarityAC = recommendationService['calculateSimilarityScore'](pluginA, pluginC);

    expect(similarityAB).toBeGreaterThan(similarityAC);
  });

  it('should clear cache when requested', () => {
    const targetPlugin = mockPlugins[0];
    const options = { maxResults: 2 };

    const firstCall = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, options);

    recommendationService.clearCache();

    const secondCall = recommendationService.getSimilarPlugins(targetPlugin, mockPlugins, options);

    // Results should be the same but cache should be cleared
    expect(firstCall).toEqual(secondCall);
  });
});
