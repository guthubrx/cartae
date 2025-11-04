/**
 * AdvancedFilters - Advanced filtering options for plugin search (Session 60A)
 */

import React, { useState } from 'react';
import type { PluginSearchFilters } from '../types';

export interface AdvancedFiltersProps {
  filters: PluginSearchFilters;
  onFiltersChange: (filters: PluginSearchFilters) => void;
}

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMinRatingChange = (value: string) => {
    const minRating = value ? parseInt(value, 10) : undefined;
    onFiltersChange({ ...filters, minRating });
  };

  const handleMinDownloadsChange = (value: string) => {
    const minDownloads = value ? parseInt(value, 10) : undefined;
    onFiltersChange({ ...filters, minDownloads });
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      ? value
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      : undefined;
    onFiltersChange({ ...filters, tags });
  };

  const handleUpdatedAfterChange = (value: string) => {
    const updatedAfter = value || undefined;
    onFiltersChange({ ...filters, updatedAfter });
  };

  const handleSortByChange = (value: string) => {
    const sortBy = value as PluginSearchFilters['sortBy'];
    onFiltersChange({ ...filters, sortBy });
  };

  const handleSortOrderChange = (value: string) => {
    const sortOrder = value as PluginSearchFilters['sortOrder'];
    onFiltersChange({ ...filters, sortOrder });
  };

  const handleLogicChange = (value: string) => {
    const logic = value as PluginSearchFilters['logic'];
    onFiltersChange({ ...filters, logic });
  };

  const hasAdvancedFilters = Boolean(
    filters.minRating ||
      filters.minDownloads ||
      filters.tags?.length ||
      filters.updatedAfter ||
      filters.sortBy ||
      filters.sortOrder ||
      filters.logic
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Expand/Collapse Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-900">Advanced Filters</span>
          {hasAdvancedFilters && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Active</span>
          )}
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Advanced Filters Content */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Rating & Downloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Minimum Rating */}
            <div>
              <label htmlFor="min-rating" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating
              </label>
              <select
                id="min-rating"
                value={filters.minRating || ''}
                onChange={e => handleMinRatingChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any rating</option>
                <option value="4">4★ & above</option>
                <option value="3">3★ & above</option>
                <option value="2">2★ & above</option>
                <option value="1">1★ & above</option>
              </select>
            </div>

            {/* Minimum Downloads */}
            <div>
              <label
                htmlFor="min-downloads"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Minimum Downloads
              </label>
              <select
                id="min-downloads"
                value={filters.minDownloads || ''}
                onChange={e => handleMinDownloadsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any downloads</option>
                <option value="1000">1,000+</option>
                <option value="5000">5,000+</option>
                <option value="10000">10,000+</option>
                <option value="50000">50,000+</option>
              </select>
            </div>
          </div>

          {/* Tags & Update Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                id="tags"
                type="text"
                placeholder="react, typescript, ui"
                value={filters.tags?.join(', ') || ''}
                onChange={e => handleTagsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Updated After */}
            <div>
              <label
                htmlFor="updated-after"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Updated After
              </label>
              <input
                id="updated-after"
                type="date"
                value={filters.updatedAfter || ''}
                onChange={e => handleUpdatedAfterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort & Logic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sort By */}
            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sort-by"
                value={filters.sortBy || ''}
                onChange={e => handleSortByChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="downloads">Downloads</option>
                <option value="updated">Last Updated</option>
                <option value="relevance">Relevance</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                id="sort-order"
                value={filters.sortOrder || ''}
                onChange={e => handleSortOrderChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {/* Filter Logic */}
            <div>
              <label
                htmlFor="filter-logic"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter Logic
              </label>
              <select
                id="filter-logic"
                value={filters.logic || ''}
                onChange={e => handleLogicChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Default (AND)</option>
                <option value="and">AND (all filters)</option>
                <option value="or">OR (any filter)</option>
              </select>
            </div>
          </div>

          {/* Clear Advanced Filters */}
          {hasAdvancedFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onFiltersChange({
                    ...filters,
                    minRating: undefined,
                    minDownloads: undefined,
                    tags: undefined,
                    updatedAfter: undefined,
                    sortBy: undefined,
                    sortOrder: undefined,
                    logic: undefined,
                  });
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear advanced filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
