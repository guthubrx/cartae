/**
 * Tests pour AIMetadataFiltersPanel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIMetadataFiltersPanel } from './AIMetadataFiltersPanel';
import type { AIMetadataFilters } from '../types';

describe('AIMetadataFiltersPanel', () => {
  const mockFilters: AIMetadataFilters = {
    priorities: [],
    sentiments: [],
  };

  const onFiltersChange = vi.fn();

  beforeEach(() => {
    onFiltersChange.mockClear();
  });

  it('should render filters panel', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    expect(screen.getByText('Filtres IA')).toBeInTheDocument();
    expect(screen.getByText('Priorité')).toBeInTheDocument();
    expect(screen.getByText('Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Métadonnées')).toBeInTheDocument();
  });

  it('should toggle priority filter', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const criticalCheckbox = screen.getByLabelText(/Critique/);
    fireEvent.click(criticalCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      priorities: ['critical'],
    });
  });

  it('should toggle sentiment filter', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const positiveCheckbox = screen.getByLabelText(/Positif/);
    fireEvent.click(positiveCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      sentiments: ['positive'],
    });
  });

  it('should toggle action items flag', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const actionItemsCheckbox = screen.getByLabelText(/Avec actions à faire/);
    fireEvent.click(actionItemsCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      hasActionItems: true,
    });
  });

  it('should toggle deadline flag', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const deadlineCheckbox = screen.getByLabelText(/Avec deadline/);
    fireEvent.click(deadlineCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      hasDeadline: true,
    });
  });

  it('should toggle connections flag', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const connectionsCheckbox = screen.getByLabelText(/Avec connexions/);
    fireEvent.click(connectionsCheckbox);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      hasConnections: true,
    });
  });

  it('should reset all filters', () => {
    const activeFilters: AIMetadataFilters = {
      priorities: ['critical', 'high'],
      sentiments: ['positive'],
      hasActionItems: true,
      hasDeadline: true,
    };

    render(<AIMetadataFiltersPanel filters={activeFilters} onFiltersChange={onFiltersChange} />);

    const resetButton = screen.getByText(/Réinitialiser/);
    fireEvent.click(resetButton);

    expect(onFiltersChange).toHaveBeenCalledWith({
      priorities: [],
      sentiments: [],
      hasActionItems: undefined,
      hasDeadline: undefined,
      hasConnections: undefined,
      dateRange: undefined,
    });
  });

  it('should show active filters count', () => {
    const activeFilters: AIMetadataFilters = {
      priorities: ['critical', 'high'],
      sentiments: ['positive'],
      hasActionItems: true,
    };

    render(<AIMetadataFiltersPanel filters={activeFilters} onFiltersChange={onFiltersChange} />);

    // 2 priorities + 1 sentiment + 1 flag = 4 filtres actifs
    expect(screen.getByText(/Réinitialiser \(4\)/)).toBeInTheDocument();
  });

  it('should display matching count when showCount is true', () => {
    render(
      <AIMetadataFiltersPanel
        filters={mockFilters}
        onFiltersChange={onFiltersChange}
        showCount={true}
        matchingCount={42}
      />
    );

    expect(screen.getByText('42 résultats')).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    const { container } = render(
      <AIMetadataFiltersPanel
        filters={mockFilters}
        onFiltersChange={onFiltersChange}
        compact={true}
      />
    );

    // Compact mode ajuste les styles, vérifier que le composant render
    expect(container.querySelector('.ai-filters-panel')).toBeInTheDocument();
  });

  it('should handle date range changes', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    // Expand date section first
    const datesHeader = screen.getByText('Plage de dates');
    fireEvent.click(datesHeader);

    const startDateInput = screen.getByLabelText(/Début/);
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          start: expect.any(Date),
        }),
      })
    );
  });

  it('should collapse/expand sections', () => {
    render(<AIMetadataFiltersPanel filters={mockFilters} onFiltersChange={onFiltersChange} />);

    const priorityHeader = screen.getByText('Priorité');
    const criticalCheckbox = screen.getByLabelText(/Critique/);

    // Initial: expanded
    expect(criticalCheckbox).toBeVisible();

    // Collapse
    fireEvent.click(priorityHeader);
    expect(criticalCheckbox).not.toBeVisible();

    // Expand again
    fireEvent.click(priorityHeader);
    expect(criticalCheckbox).toBeVisible();
  });
});
