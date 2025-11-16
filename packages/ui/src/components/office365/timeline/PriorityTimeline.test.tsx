/**
 * Tests pour PriorityTimeline
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityTimeline } from './PriorityTimeline';
import type { EnrichedOffice365Item } from '../types';

describe('PriorityTimeline', () => {
  const mockItems: EnrichedOffice365Item[] = [
    {
      id: 'item-1',
      type: 'email',
      source: 'office365',
      title: 'Critical security issue',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      metadata: { from: 'security@example.com' },
      aiViz: {
        priority: {
          level: 'critical',
          score: 0.95,
          color: '#EF4444',
        },
        hasDeadline: true,
        deadlineDate: new Date('2024-01-20T00:00:00Z'),
      },
    },
    {
      id: 'item-2',
      type: 'email',
      source: 'office365',
      title: 'Meeting notes',
      createdAt: new Date('2024-01-15T14:00:00Z'),
      updatedAt: new Date('2024-01-15T14:00:00Z'),
      metadata: { from: 'alice@example.com' },
      aiViz: {
        priority: {
          level: 'low',
          score: 0.3,
          color: '#22C55E',
        },
        hasActionItems: true,
        actionItemCount: 3,
      },
    },
    {
      id: 'item-3',
      type: 'email',
      source: 'office365',
      title: 'Q4 project update',
      createdAt: new Date('2024-01-16T09:00:00Z'),
      updatedAt: new Date('2024-01-16T09:00:00Z'),
      metadata: { from: 'manager@example.com' },
      aiViz: {
        priority: {
          level: 'high',
          score: 0.8,
          color: '#F97316',
        },
        hasConnections: true,
        connectionCount: 5,
      },
    },
  ];

  it('should render timeline with items', () => {
    render(<PriorityTimeline items={mockItems} />);

    expect(screen.getByText('Critical security issue')).toBeInTheDocument();
    expect(screen.getByText('Meeting notes')).toBeInTheDocument();
    expect(screen.getByText('Q4 project update')).toBeInTheDocument();
  });

  it('should display priority legend when showLegend is true', () => {
    render(<PriorityTimeline items={mockItems} showLegend={true} />);

    expect(screen.getByText('Priorité :')).toBeInTheDocument();
    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(screen.getByText('Moyenne')).toBeInTheDocument();
    expect(screen.getByText('Basse')).toBeInTheDocument();
  });

  it('should hide legend when showLegend is false', () => {
    render(<PriorityTimeline items={mockItems} showLegend={false} />);

    expect(screen.queryByText('Priorité :')).not.toBeInTheDocument();
  });

  it('should group items by day', () => {
    render(<PriorityTimeline items={mockItems} showDateLabels={true} />);

    // 15 janvier et 16 janvier
    expect(screen.getByText(/15 janvier/)).toBeInTheDocument();
    expect(screen.getByText(/16 janvier/)).toBeInTheDocument();
  });

  it('should display metadata badges', () => {
    render(<PriorityTimeline items={mockItems} />);

    expect(screen.getByText('Deadline')).toBeInTheDocument();
    expect(screen.getByText(/3 actions/)).toBeInTheDocument();
    expect(screen.getByText(/5 liens/)).toBeInTheDocument();
  });

  it('should call onItemClick when item is clicked', () => {
    const onItemClick = vi.fn();
    render(<PriorityTimeline items={mockItems} onItemClick={onItemClick} />);

    const item = screen.getByText('Critical security issue').closest('.timeline-item');
    item?.click();

    expect(onItemClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should sort items by date (most recent first)', () => {
    render(<PriorityTimeline items={mockItems} />);

    const items = screen.getAllByRole('article'); // Assuming timeline-item has role="article"
    // Plus récent (16 jan) devrait être en premier
    expect(items[0]).toHaveTextContent('Q4 project update');
  });

  it('should display empty state when no items', () => {
    render(<PriorityTimeline items={[]} />);

    expect(screen.getByText('Aucun email à afficher')).toBeInTheDocument();
  });

  it('should display sender information', () => {
    render(<PriorityTimeline items={mockItems} />);

    expect(screen.getByText(/De : security@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/De : alice@example.com/)).toBeInTheDocument();
  });
});
