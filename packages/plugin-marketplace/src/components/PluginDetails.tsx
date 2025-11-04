/**
 * PluginDetails - Complete plugin details page with ratings, stats, and screenshots
 */

import React, { useEffect, useState } from 'react';
import type { PluginListing } from '../types';
import { InstallButton } from './InstallButton';
import { RatingStats } from './RatingStats';
import { RatingList } from './RatingList';
import { RatingForm } from './RatingForm';
import { PluginRecommendations } from './PluginRecommendations';
import { RatingService } from '../RatingService';
import { HistoryService } from '../services/HistoryService';
import { AnalyticsService } from '../services/AnalyticsService';

export interface PluginDetailsProps {
  plugin: PluginListing;
  installed?: boolean;
  onInstall?: (pluginId: string) => Promise<void>;
  onUninstall?: (pluginId: string) => Promise<void>;
  onBack?: () => void;
  // Session 60B - Recommendations props
  allPlugins?: PluginListing[];
  installedPlugins?: string[];
  onViewDetails?: (pluginId: string) => void;
}

export function PluginDetails({
  plugin,
  installed = false,
  onInstall,
  onUninstall,
  onBack,
  // Session 60B - Recommendations props
  allPlugins = [],
  installedPlugins = [],
  onViewDetails,
}: PluginDetailsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'changelog'>('overview');
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const ratingService = new RatingService();

  // Scroll to top on mount and record view history
  useEffect(() => {
    window.scrollTo(0, 0);

    // Record plugin view in history
    HistoryService.addToHistory(plugin.id, plugin.name, plugin.category);

    // Track analytics
    AnalyticsService.trackView(plugin.id, plugin.name);
  }, [plugin.id, plugin.name, plugin.category]);

  const formatDownloads = (count?: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));

  const handleSubmitReview = async (data: any) => {
    await ratingService.submitRating(data);
    setShowReviewForm(false);
  };

  const handleScreenshotPrev = () => {
    if (!plugin.screenshots) return;
    setActiveScreenshot(prev => (prev === 0 ? plugin.screenshots!.length - 1 : prev - 1));
  };

  const handleScreenshotNext = () => {
    if (!plugin.screenshots) return;
    setActiveScreenshot(prev => (prev === plugin.screenshots!.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>←</span>
          <span>Back to marketplace</span>
        </button>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-6">
          {/* Icon */}
          {plugin.icon ? (
            <img
              src={plugin.icon}
              alt={plugin.name}
              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-4xl">🧩</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">{plugin.name}</h1>
                  {plugin.verified && (
                    <span className="text-blue-500 text-2xl" title="Verified plugin">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-lg text-gray-600">
                  by {typeof plugin.author === 'string' ? plugin.author : plugin.author.name}
                </p>
              </div>

              <InstallButton
                pluginId={plugin.id}
                installed={installed}
                onInstall={onInstall}
                onUninstall={onUninstall}
              />
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              {plugin.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-semibold">{plugin.rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span>⬇️</span>
                <span>{formatDownloads(plugin.downloads)} downloads</span>
              </div>
              <div>
                <span>v{plugin.version}</span>
              </div>
              <div>
                <span>{formatSize(plugin.size)}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-700 mb-4">{plugin.description}</p>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {plugin.category && (
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                  {plugin.category}
                </span>
              )}
              {plugin.tags?.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots carousel */}
      {plugin.screenshots && plugin.screenshots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Screenshots</h2>
          <div className="relative">
            <img
              src={plugin.screenshots[activeScreenshot]}
              alt={`Screenshot ${activeScreenshot + 1}`}
              className="w-full h-96 object-contain bg-gray-50 rounded-lg"
            />

            {/* Navigation buttons */}
            {plugin.screenshots.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handleScreenshotPrev}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white
                    rounded-full hover:bg-black/70 transition-colors`}
                  aria-label="Previous screenshot"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleScreenshotNext}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white
                    rounded-full hover:bg-black/70 transition-colors`}
                  aria-label="Next screenshot"
                >
                  →
                </button>
              </>
            )}

            {/* Indicators */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {plugin.screenshots.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveScreenshot(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === activeScreenshot ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to screenshot ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'changelog'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Changelog
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Long description */}
          {plugin.longDescription && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{plugin.longDescription}</p>
              </div>
            </div>
          )}

          {/* Additional info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">Version</dt>
                <dd className="text-gray-900">{plugin.version}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Updated</dt>
                <dd className="text-gray-900">{formatDate(plugin.updatedAt)}</dd>
              </div>
              {plugin.license && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">License</dt>
                  <dd className="text-gray-900">{plugin.license}</dd>
                </div>
              )}
              {plugin.homepage && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">Website</dt>
                  <dd>
                    <a
                      href={plugin.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit website →
                    </a>
                  </dd>
                </div>
              )}
              {plugin.repository && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-600">Repository</dt>
                  <dd>
                    <a
                      href={plugin.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {plugin.repository}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Session 60B - Plugin Recommendations */}
          {allPlugins.length > 0 && onInstall && onViewDetails && (
            <PluginRecommendations
              targetPlugin={plugin}
              allPlugins={allPlugins}
              installedPlugins={installedPlugins}
              onInstall={onInstall}
              onViewDetails={onViewDetails}
              type="similar"
              title="Similar Plugins"
              maxResults={4}
            />
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Rating stats */}
          <RatingStats
            stats={{
              totalCount: 0,
              averageRating: plugin.rating || 0,
              distribution: [0, 0, 0, 0, 0],
              lastRatingDate: undefined,
            }}
            pluginId={plugin.id}
          />

          {/* Write review button */}
          {!showReviewForm && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Write a Review
            </button>
          )}

          {/* Review form */}
          {showReviewForm && (
            <RatingForm
              pluginId={plugin.id}
              onSubmit={handleSubmitReview}
              onCancel={() => setShowReviewForm(false)}
            />
          )}

          {/* Rating list */}
          <RatingList pluginId={plugin.id} />
        </div>
      )}

      {activeTab === 'changelog' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Changelog</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Version {plugin.version}</h3>
              <p className="text-sm text-gray-600">{formatDate(plugin.updatedAt)}</p>
              <p className="mt-2 text-gray-700">
                {plugin.longDescription || 'No changelog available for this version.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
