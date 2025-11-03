/**
 * RatingCard - Display a single rating with author, stars, comment, and helpful count
 */

import React, { useState } from 'react';
import type { Rating } from '../types';

export interface RatingCardProps {
  rating: Rating;
  onMarkHelpful?: (ratingId: string, helpful: boolean) => Promise<void>;
  onReport?: (ratingId: string) => void;
  showModeration?: boolean;
  onModerate?: (ratingId: string, approved: boolean, reason?: string) => Promise<void>;
}

export function RatingCard({
  rating,
  onMarkHelpful,
  onReport,
  showModeration = false,
  onModerate
}: RatingCardProps) {
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={star <= count ? 'text-yellow-500' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const handleMarkHelpful = async (helpful: boolean) => {
    if (!onMarkHelpful || helpfulLoading) return;

    setHelpfulLoading(true);
    try {
      await onMarkHelpful(rating.id, helpful);
    } finally {
      setHelpfulLoading(false);
    }
  };

  const handleModerate = async (approved: boolean) => {
    if (!onModerate || moderationLoading) return;

    setModerationLoading(true);
    try {
      const reason = approved ? 'Approved by moderator' : 'Rejected by moderator';
      await onModerate(rating.id, approved, reason);
    } finally {
      setModerationLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (rating.status) {
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {/* Author avatar placeholder */}
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600
                flex items-center justify-center text-white font-semibold`}
            >
              {rating.author.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="font-semibold text-gray-900">{rating.author}</p>
              <div className="flex items-center gap-2">
                {renderStars(rating.rating)}
                <span className="text-xs text-gray-500">{formatDate(rating.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status badge (if moderation mode) */}
        {showModeration && getStatusBadge()}
      </div>

      {/* Title (if present) */}
      {rating.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{rating.title}</h4>
      )}

      {/* Comment */}
      {rating.comment && (
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{rating.comment}</p>
      )}

      {/* Moderation notes (admin only) */}
      {showModeration && rating.moderationNotes && (
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Moderation Note:</strong> {rating.moderationNotes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        {/* Helpful buttons */}
        {onMarkHelpful && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkHelpful(true)}
              disabled={helpfulLoading}
              className={`flex items-center gap-1 text-sm text-gray-600 hover:text-green-600
                transition-colors disabled:opacity-50`}
              aria-label="Mark as helpful"
            >
              <span>👍</span>
              <span>{rating.helpful}</span>
            </button>

            <button
              type="button"
              onClick={() => handleMarkHelpful(false)}
              disabled={helpfulLoading}
              className={`flex items-center gap-1 text-sm text-gray-600 hover:text-red-600
                transition-colors disabled:opacity-50`}
              aria-label="Mark as unhelpful"
            >
              <span>👎</span>
              <span>{rating.unhelpful}</span>
            </button>
          </div>
        )}

        {/* Report button */}
        {onReport && (
          <button
            type="button"
            onClick={() => onReport(rating.id)}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Report
          </button>
        )}

        {/* Moderation actions (admin only) */}
        {showModeration && onModerate && rating.status === 'pending' && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleModerate(true)}
              disabled={moderationLoading}
              className={`px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700
                transition-colors disabled:opacity-50`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => handleModerate(false)}
              disabled={moderationLoading}
              className={`px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700
                transition-colors disabled:opacity-50`}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
