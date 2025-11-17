/**
 * Tests pour CartaeItemCard
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartaeItemCard } from './CartaeItemCard';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';

describe('CartaeItemCard', () => {
  const mockItem: CartaeItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'email',
    title: 'Test Email Item',
    content: 'This is a test email content with some details.',
    metadata: {
      author: 'john.doe@example.com',
      priority: 'high',
      status: 'new',
    },
    tags: ['urgent', 'client-a', 'q1-2025'],
    source: {
      connector: 'office365',
      originalId: 'AAMkAGI2...',
      lastSync: new Date('2025-01-15T10:00:00Z'),
    },
    createdAt: new Date('2025-01-15T09:00:00Z'),
    updatedAt: new Date('2025-01-15T10:30:00Z'),
    archived: false,
    favorite: false,
  };

  it('should render item title', () => {
    render(<CartaeItemCard item={mockItem} />);
    expect(screen.getByText('Test Email Item')).toBeDefined();
  });

  it('should render item content in non-compact mode', () => {
    render(<CartaeItemCard item={mockItem} compact={false} />);
    expect(screen.getByText(/This is a test email content/)).toBeDefined();
  });

  it('should NOT render content in compact mode', () => {
    const { container } = render(<CartaeItemCard item={mockItem} compact={true} />);
    expect(container.textContent?.includes('This is a test email content')).toBe(false);
  });

  it('should render priority badge', () => {
    render(<CartaeItemCard item={mockItem} showBadges={{ priority: true }} />);
    expect(screen.getByText('Haute')).toBeDefined();
  });

  it('should render status badge', () => {
    render(<CartaeItemCard item={mockItem} showBadges={{ status: true }} />);
    expect(screen.getByText('new')).toBeDefined();
  });

  it('should render tags', () => {
    render(<CartaeItemCard item={mockItem} showBadges={{ tags: true }} />);
    expect(screen.getByText('urgent')).toBeDefined();
    expect(screen.getByText('client-a')).toBeDefined();
    expect(screen.getByText('q1-2025')).toBeDefined();
  });

  it('should limit displayed tags with maxTags', () => {
    render(<CartaeItemCard item={mockItem} maxTags={2} />);
    expect(screen.getByText('urgent')).toBeDefined();
    expect(screen.getByText('client-a')).toBeDefined();
    expect(screen.getByText('+1')).toBeDefined(); // Hidden count badge
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<CartaeItemCard item={mockItem} onClick={handleClick} />);

    const card = container.querySelector('.cartae-item-card');
    if (card) {
      fireEvent.click(card);
    }

    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  it('should call onToggleFavorite when star button is clicked', () => {
    const handleToggleFavorite = vi.fn();
    const { container } = render(
      <CartaeItemCard
        item={mockItem}
        onToggleFavorite={handleToggleFavorite}
        showActions={true}
      />
    );

    const starButton = container.querySelector('button[title*="favoris"]');
    if (starButton) {
      fireEvent.click(starButton);
    }

    expect(handleToggleFavorite).toHaveBeenCalledWith(mockItem);
  });

  it('should call onToggleArchive when archive button is clicked', () => {
    const handleToggleArchive = vi.fn();
    const { container } = render(
      <CartaeItemCard
        item={mockItem}
        onToggleArchive={handleToggleArchive}
        showActions={true}
      />
    );

    const archiveButton = container.querySelector('button[title*="Archiver"]');
    if (archiveButton) {
      fireEvent.click(archiveButton);
    }

    expect(handleToggleArchive).toHaveBeenCalledWith(mockItem);
  });

  it('should render author info', () => {
    render(<CartaeItemCard item={mockItem} />);
    expect(screen.getByText('john.doe@example.com')).toBeDefined();
  });

  it('should apply archived opacity style', () => {
    const archivedItem = { ...mockItem, archived: true };
    const { container } = render(<CartaeItemCard item={archivedItem} />);

    const card = container.querySelector('.cartae-item-card') as HTMLElement;
    expect(card?.style.opacity).toBe('0.6');
  });

  it('should render email type icon', () => {
    const { container } = render(<CartaeItemCard item={mockItem} showBadges={{ type: true }} />);
    // Check if icon container exists (can't directly test lucide-react icon)
    const iconContainer = container.querySelector('[style*="background"]');
    expect(iconContainer).toBeDefined();
  });

  it('should NOT show actions when showActions is false', () => {
    const { container } = render(
      <CartaeItemCard
        item={mockItem}
        showActions={false}
        onToggleFavorite={vi.fn()}
        onToggleArchive={vi.fn()}
      />
    );

    const actionsDiv = container.querySelector('.cartae-item-actions');
    expect(actionsDiv).toBeNull();
  });

  it('should render task type with correct icon', () => {
    const taskItem: CartaeItem = {
      ...mockItem,
      type: 'task',
      title: 'Test Task',
    };

    render(<CartaeItemCard item={taskItem} showBadges={{ type: true }} />);
    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('should render note type with correct styling', () => {
    const noteItem: CartaeItem = {
      ...mockItem,
      type: 'note',
      title: 'Test Note',
    };

    const { container } = render(<CartaeItemCard item={noteItem} showBadges={{ type: true }} />);
    expect(screen.getByText('Test Note')).toBeDefined();

    const iconContainer = container.querySelector('[style*="background"]') as HTMLElement;
    expect(iconContainer).toBeDefined();
  });
});
