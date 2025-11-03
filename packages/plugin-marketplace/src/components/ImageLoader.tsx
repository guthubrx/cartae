/**
 * ImageLoader - Lazy loading optimisé pour images de plugins
 * Utilise Intersection Observer + placeholder + fade-in animation
 */

import React, { useState, useEffect, useRef } from 'react';

export interface ImageLoaderProps {
  /** URL de l'image à charger */
  src: string;
  /** Texte alternatif */
  alt: string;
  /** Classes CSS additionnelles */
  className?: string;
  /** Image placeholder pendant le chargement (default: gray box) */
  placeholder?: string;
  /** Emoji fallback si l'image échoue (default: 🧩) */
  fallbackEmoji?: string;
  /** Lazy load distance (default: 200px) */
  rootMargin?: string;
}

export function ImageLoader({
  src,
  alt,
  className = '',
  placeholder,
  fallbackEmoji = '🧩',
  rootMargin = '200px'
}: ImageLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer pour lazy loading
  useEffect(() => {
    if (!imgRef.current) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      {
        rootMargin,
        threshold: 0
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [rootMargin]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      style={{ minHeight: '100%' }}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder ? (
            <img
              src={placeholder}
              alt={`${alt} placeholder`}
              className="w-full h-full object-cover blur-sm opacity-50"
            />
          ) : (
            <div className="animate-pulse bg-gray-300 w-full h-full" />
          )}
        </div>
      )}

      {/* Real image (load only when in view) */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}

      {/* Fallback on error */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-4xl opacity-50">{fallbackEmoji}</span>
        </div>
      )}

      {/* Loading spinner overlay */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}

/**
 * IconLoader - Variante optimisée pour petites icônes de plugins
 */
export interface IconLoaderProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackEmoji?: string;
}

export function IconLoader({
  src,
  alt,
  size = 'md',
  fallbackEmoji = '🧩'
}: IconLoaderProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const emojiSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  if (hasError) {
    return (
      <div
        className={`${sizeClasses[size]} rounded bg-gray-200 flex items-center justify-center flex-shrink-0`}
      >
        <span className={emojiSizes[size]}>{fallbackEmoji}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded overflow-hidden flex-shrink-0 relative`}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-300" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
    </div>
  );
}
