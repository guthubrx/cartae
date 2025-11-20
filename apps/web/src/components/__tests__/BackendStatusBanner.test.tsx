import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackendStatusBanner } from '../BackendStatusBanner';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('BackendStatusBanner', () => {
  const mockRecheck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne devrait PAS afficher si status online', () => {
    const { container } = render(<BackendStatusBanner status="online" onRecheck={mockRecheck} />);

    // Container vide (banner masqué)
    expect(container.firstChild).toBeNull();
  });

  it('devrait afficher checking state pendant vérification', () => {
    render(<BackendStatusBanner status="checking" onRecheck={mockRecheck} />);

    expect(screen.getByText(/Vérification backend/i)).toBeInTheDocument();
  });

  it('devrait afficher offline state avec instructions', () => {
    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    // Vérifier titre
    expect(screen.getByText(/Backend non disponible/i)).toBeInTheDocument();

    // Vérifier URL backend affichée
    expect(screen.getByText(/http:\/\/localhost:3001/)).toBeInTheDocument();

    // Vérifier instructions
    expect(screen.getByText(/Pour démarrer le backend/i)).toBeInTheDocument();
    expect(screen.getByText(/cd packages\/database-api && pnpm dev/)).toBeInTheDocument();

    // Vérifier boutons
    expect(screen.getByText(/Retester/i)).toBeInTheDocument();
    expect(screen.getByText(/Copier/i)).toBeInTheDocument();
  });

  it("devrait afficher message d'erreur si fourni", () => {
    render(<BackendStatusBanner status="offline" error="HTTP 503" onRecheck={mockRecheck} />);

    expect(screen.getByText(/Erreur : HTTP 503/i)).toBeInTheDocument();
  });

  it('devrait utiliser backendUrl custom si fourni', () => {
    const customUrl = 'http://custom-backend:4000';

    render(<BackendStatusBanner status="offline" backendUrl={customUrl} onRecheck={mockRecheck} />);

    expect(screen.getByText(customUrl)).toBeInTheDocument();
  });

  it('devrait appeler onRecheck quand bouton Retester cliqué', async () => {
    mockRecheck.mockResolvedValue(undefined);

    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    const retestButton = screen.getByText(/Retester/i);
    fireEvent.click(retestButton);

    await waitFor(() => {
      expect(mockRecheck).toHaveBeenCalledTimes(1);
    });
  });

  it('devrait afficher loading state pendant recheck', async () => {
    // Mock qui prend du temps
    mockRecheck.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    const retestButton = screen.getByText(/Retester/i);
    fireEvent.click(retestButton);

    // Vérifier état loading
    expect(screen.getByText(/Vérification.../i)).toBeInTheDocument();

    // Attendre fin recheck
    await waitFor(() => {
      expect(screen.queryByText(/Vérification.../i)).not.toBeInTheDocument();
    });
  });

  it('devrait copier commande dans clipboard', async () => {
    (navigator.clipboard.writeText as any).mockResolvedValue(undefined);

    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    const copyButton = screen.getByText(/Copier/i);
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'cd packages/database-api && pnpm dev'
      );
    });

    // Vérifier feedback succès
    expect(screen.getByText(/Copié/i)).toBeInTheDocument();
  });

  it('devrait reset feedback copie après 2s', async () => {
    vi.useFakeTimers();
    (navigator.clipboard.writeText as any).mockResolvedValue(undefined);

    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    const copyButton = screen.getByText(/Copier/i);
    fireEvent.click(copyButton);

    // Attendre feedback
    await waitFor(() => {
      expect(screen.getByText(/Copié/i)).toBeInTheDocument();
    });

    // Avancer de 2s
    vi.advanceTimersByTime(2000);

    // Feedback devrait disparaître
    await waitFor(() => {
      expect(screen.queryByText(/Copié/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Copier/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('devrait gérer erreur copie clipboard', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard denied'));

    render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    const copyButton = screen.getByText(/Copier/i);
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur copie clipboard:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('devrait avoir styles accessibles (contraste WCAG)', () => {
    const { container } = render(<BackendStatusBanner status="offline" onRecheck={mockRecheck} />);

    // Vérifier que le container a les bons styles
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveStyle({
      backgroundColor: '#FEF3C7',
      border: '2px solid #F59E0B',
    });
  });
});
