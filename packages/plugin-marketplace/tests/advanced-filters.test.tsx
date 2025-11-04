/**
 * Advanced Filters Tests (Session 60A)
 */

import { describe, it, expect } from '@playwright/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '../src/components/AdvancedFilters';
import type { PluginSearchFilters } from '../src/types';

describe('AdvancedFilters Component', () => {
  it('should render advanced filters section', () => {
    const mockFilters: PluginSearchFilters = {};
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  it('should expand/collapse when header is clicked', () => {
    const mockFilters: PluginSearchFilters = {};
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    const header = screen.getByText('Advanced Filters');
    fireEvent.click(header);

    expect(screen.getByLabelText('Minimum Rating')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Downloads')).toBeInTheDocument();
  });

  it('should show active badge when filters are applied', () => {
    const mockFilters: PluginSearchFilters = {
      minRating: 4,
      minDownloads: 1000,
    };
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should update filters when rating is changed', () => {
    const mockFilters: PluginSearchFilters = {};
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    // Expand first
    fireEvent.click(screen.getByText('Advanced Filters'));

    const ratingSelect = screen.getByLabelText('Minimum Rating');
    fireEvent.change(ratingSelect, { target: { value: '4' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      minRating: 4,
    });
  });

  it('should handle multiple tags input', () => {
    const mockFilters: PluginSearchFilters = {};
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    // Expand first
    fireEvent.click(screen.getByText('Advanced Filters'));

    const tagsInput = screen.getByLabelText('Tags (comma separated)');
    fireEvent.change(tagsInput, { target: { value: 'react, typescript, ui' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      tags: ['react', 'typescript', 'ui'],
    });
  });

  it('should show clear button when advanced filters are active', () => {
    const mockFilters: PluginSearchFilters = {
      minRating: 4,
      tags: ['react'],
    };
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    // Expand first
    fireEvent.click(screen.getByText('Advanced Filters'));

    expect(screen.getByText('Clear advanced filters')).toBeInTheDocument();
  });

  it('should clear advanced filters when clear button is clicked', () => {
    const mockFilters: PluginSearchFilters = {
      minRating: 4,
      tags: ['react'],
      sortBy: 'rating',
    };
    const mockOnChange = vi.fn();

    render(<AdvancedFilters filters={mockFilters} onFiltersChange={mockOnChange} />);

    // Expand first
    fireEvent.click(screen.getByText('Advanced Filters'));

    const clearButton = screen.getByText('Clear advanced filters');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      minRating: undefined,
      minDownloads: undefined,
      tags: undefined,
      updatedAfter: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      logic: undefined,
    });
  });
});
