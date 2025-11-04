/**
 * PluginFilters - Filters for plugin search
 */

import React, { useState } from 'react';
import type { PluginSearchFilters } from '../types';
import { AdvancedFilters } from './AdvancedFilters';

export interface PluginFiltersProps {
  filters: PluginSearchFilters;
  onFiltersChange: (filters: PluginSearchFilters) => void;
}

export function PluginFilters({ filters, onFiltersChange }: PluginFiltersProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [pricing, setPricing] = useState<string>('');
  const [verified, setVerified] = useState(false);

  const applyFilters = (updates: Partial<PluginSearchFilters>) => {
    const newFilters: PluginSearchFilters = {
      ...filters,
      search: search || undefined,
      category: category || undefined,
      pricing: (pricing as any) || undefined,
      verified: verified || undefined,
      ...updates,
    };

    onFiltersChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    applyFilters({ search: value });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    applyFilters({ category: value || undefined });
  };

  const handlePricingChange = (value: string) => {
    setPricing(value);
    applyFilters({ pricing: (value as any) || undefined });
  };

  const handleVerifiedChange = (checked: boolean) => {
    setVerified(checked);
    applyFilters({ verified: checked || undefined });
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setPricing('');
    setVerified(false);
    onFiltersChange({});
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search */}
      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
          Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="Search plugins..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
            focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category */}
        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={e => handleCategoryChange(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
              focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">All Categories</option>
            <option value="productivity">Productivity</option>
            <option value="integration">Integration</option>
            <option value="theme">Theme</option>
            <option value="developer">Developer</option>
            <option value="export">Export</option>
            <option value="template">Template</option>
          </select>
        </div>

        {/* Pricing */}
        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="pricing" className="block text-sm font-medium text-gray-700 mb-1">
            Pricing
          </label>
          <select
            id="pricing"
            value={pricing}
            onChange={e => handlePricingChange(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
              focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">All Pricing</option>
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Verified Only */}
        <div className="flex items-end">
          <label htmlFor="verified-only" className="flex items-center cursor-pointer">
            <input
              id="verified-only"
              type="checkbox"
              checked={verified}
              onChange={e => handleVerifiedChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Verified only</span>
          </label>
        </div>
      </div>

      {/* Reset button */}
      {(search || category || pricing || verified) && (
        <div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      <AdvancedFilters filters={filters} onFiltersChange={onFiltersChange} />
    </div>
  );
}
