/**
 * OptimizedPluginList - Liste virtualisée et optimisée pour grandes listes de plugins
 * Utilise window virtualization (render only visible items)
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { PluginListing } from '../types';
import { PluginCard } from './PluginCard';

export interface OptimizedPluginListProps {
  plugins: PluginListing[];
  installed?: string[];
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (pluginId: string) => void;
  /** Hauteur estimée d'une card (px) pour virtualisation */
  itemHeight?: number;
  /** Nombre d'items à rendre au-dessus/en-dessous du viewport */
  overscan?: number;
}

export function OptimizedPluginList({
  plugins,
  installed = [],
  onInstall,
  onViewDetails,
  itemHeight = 300,
  overscan = 2
}: OptimizedPluginListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  // Update container height on resize
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate visible range
  const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      plugins.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      visibleStart: start,
      visibleEnd: end,
      totalHeight: plugins.length * itemHeight
    };
  }, [scrollTop, containerHeight, plugins.length, itemHeight, overscan]);

  // Get visible plugins
  const visiblePlugins = useMemo(() => {
    return plugins.slice(visibleStart, visibleEnd).map((plugin, index) => ({
      plugin,
      index: visibleStart + index
    }));
  }, [plugins, visibleStart, visibleEnd]);

  if (plugins.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">🔍</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No plugins found</h3>
        <p className="text-gray-600">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative h-full overflow-y-auto"
      style={{
        maxHeight: '100vh',
        overflowX: 'hidden'
      }}
    >
      {/* Virtual container avec hauteur totale */}
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative'
        }}
      >
        {/* Render only visible items */}
        <div
          style={{
            transform: `translateY(${visibleStart * itemHeight}px)`
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {visiblePlugins.map(({ plugin, index }) => (
              <div
                key={plugin.id}
                style={{
                  minHeight: `${itemHeight}px`
                }}
              >
                <PluginCard
                  plugin={plugin}
                  installed={installed.includes(plugin.id)}
                  onInstall={onInstall}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      {plugins.length > 10 && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-lg">
          <span className="text-sm text-gray-600">
            {visibleStart + 1}-{Math.min(visibleEnd, plugins.length)} / {plugins.length}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized PluginCard pour éviter re-renders inutiles
 */
const MemoizedPluginCard = React.memo(
  PluginCard,
  (prevProps, nextProps) =>
    prevProps.plugin.id === nextProps.plugin.id &&
    prevProps.installed === nextProps.installed
);

/**
 * OptimizedPluginGrid - Grille simple avec memoization (pas de virtualisation)
 * Pour listes courtes (< 50 items)
 */
export interface OptimizedPluginGridProps {
  plugins: PluginListing[];
  installed?: string[];
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (pluginId: string) => void;
}

export function OptimizedPluginGrid({
  plugins,
  installed = [],
  onInstall,
  onViewDetails
}: OptimizedPluginGridProps) {
  if (plugins.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">🔍</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No plugins found</h3>
        <p className="text-gray-600">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plugins.map(plugin => (
        <MemoizedPluginCard
          key={plugin.id}
          plugin={plugin}
          installed={installed.includes(plugin.id)}
          onInstall={onInstall}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
