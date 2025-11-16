/**
 * Tests pour AIMetadataBadges
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIMetadataBadges, PriorityIndicator, SentimentIndicator } from './AIMetadataBadges';
import type { EnrichedOffice365Item } from '../types';

describe('AIMetadataBadges', () => {
  const mockItem: EnrichedOffice365Item = {
    id: 'test-1',
    type: 'email',
    source: 'office365',
    title: 'Test email',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
    aiViz: {
      priority: {
        level: 'high',
        score: 0.85,
        color: '#F97316',
      },
      sentiment: {
        type: 'positive',
        score: 0.7,
        color: '#84CC16',
      },
      hasActionItems: true,
      actionItemCount: 3,
      hasDeadline: true,
      deadlineDate: new Date('2024-01-20T00:00:00Z'),
      hasConnections: true,
      connectionCount: 5,
      hasSummary: true,
    },
  };

  it('should render all badges for fully enriched item', () => {
    render(<AIMetadataBadges item={mockItem} />);

    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(screen.getByText('Positif')).toBeInTheDocument();
    expect(screen.getByText(/3 actions/)).toBeInTheDocument();
    expect(screen.getByText(/5 liens/)).toBeInTheDocument();
    expect(screen.getByText('Résumé')).toBeInTheDocument();
  });

  it('should render priority badge only when specified', () => {
    render(<AIMetadataBadges item={mockItem} show={{ priority: true }} />);

    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(screen.queryByText('Positif')).not.toBeInTheDocument();
    expect(screen.queryByText(/actions/)).not.toBeInTheDocument();
  });

  it('should render sentiment badge only when specified', () => {
    render(<AIMetadataBadges item={mockItem} show={{ sentiment: true }} />);

    expect(screen.getByText('Positif')).toBeInTheDocument();
    expect(screen.queryByText('Haute')).not.toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    const { container } = render(<AIMetadataBadges item={mockItem} compact={true} />);

    // Compact mode ne montre pas les labels, juste les icônes
    expect(container.querySelector('.ai-metadata-badges')).toBeInTheDocument();
  });

  it('should not render badges when item has no AI metadata', () => {
    const minimalItem: EnrichedOffice365Item = {
      id: 'test-2',
      type: 'email',
      source: 'office365',
      title: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    const { container } = render(<AIMetadataBadges item={minimalItem} />);

    expect(container.querySelector('.ai-metadata-badges')).toBeEmptyDOMElement();
  });

  it('should display deadline badge with urgent styling for near deadlines', () => {
    const urgentItem: EnrichedOffice365Item = {
      ...mockItem,
      aiViz: {
        hasDeadline: true,
        deadlineDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
      },
    };

    render(<AIMetadataBadges item={urgentItem} />);

    const deadlineBadge = screen.getByTitle(/Deadline:/);
    expect(deadlineBadge).toBeInTheDocument();
    // Urgent deadline devrait avoir une animation pulse
    expect(deadlineBadge).toHaveStyle({ animation: expect.stringContaining('pulse') });
  });

  it('should display deadline badge with normal styling for distant deadlines', () => {
    const normalItem: EnrichedOffice365Item = {
      ...mockItem,
      aiViz: {
        hasDeadline: true,
        deadlineDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
      },
    };

    render(<AIMetadataBadges item={normalItem} />);

    const deadlineBadge = screen.getByTitle(/Deadline:/);
    expect(deadlineBadge).toBeInTheDocument();
    expect(deadlineBadge).not.toHaveStyle({ animation: expect.stringContaining('pulse') });
  });

  it('should display correct sentiment emoji', () => {
    const veryPositiveItem: EnrichedOffice365Item = {
      ...mockItem,
      aiViz: {
        sentiment: {
          type: 'very_positive',
          score: 0.95,
          color: '#10B981',
        },
      },
    };

    render(<AIMetadataBadges item={veryPositiveItem} />);

    expect(screen.getByText('😄')).toBeInTheDocument();
  });
});

describe('PriorityIndicator', () => {
  it('should render priority indicator with label', () => {
    render(<PriorityIndicator level="critical" score={0.95} />);

    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Score: 0.95')).toBeInTheDocument();
  });

  it('should render without score', () => {
    render(<PriorityIndicator level="high" />);

    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });
});

describe('SentimentIndicator', () => {
  it('should render sentiment indicator with emoji and label', () => {
    render(<SentimentIndicator type="positive" score={0.75} />);

    expect(screen.getByText('Positif')).toBeInTheDocument();
    expect(screen.getByText('🙂')).toBeInTheDocument();
    expect(screen.getByText('Score: 0.75')).toBeInTheDocument();
  });

  it('should render without score', () => {
    render(<SentimentIndicator type="neutral" />);

    expect(screen.getByText('Neutre')).toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it('should display correct emoji for each sentiment type', () => {
    const sentiments: Array<{ type: any; emoji: string }> = [
      { type: 'very_positive', emoji: '😄' },
      { type: 'positive', emoji: '🙂' },
      { type: 'neutral', emoji: '😐' },
      { type: 'negative', emoji: '😕' },
      { type: 'very_negative', emoji: '😠' },
    ];

    sentiments.forEach(({ type, emoji }) => {
      const { unmount } = render(<SentimentIndicator type={type} />);
      expect(screen.getByText(emoji)).toBeInTheDocument();
      unmount();
    });
  });
});
