/**
 * RatingForm - Form to submit a rating for a plugin
 */

import React, { useState } from 'react';
import type { SubmitRatingData } from '../types';

export interface RatingFormProps {
  pluginId: string;
  onSubmit: (data: SubmitRatingData) => Promise<void>;
  onCancel?: () => void;
}

export function RatingForm({ pluginId, onSubmit, onCancel }: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Client-side spam detection
  const detectSpam = (text: string): boolean => {
    if (!text) return false;

    // Check for excessive caps (ratio descriptif des majuscules)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) return true;

    // Check for suspicious links (liens suspects)
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 1) return true;

    // Check for repeated characters (caractères répétés)
    if (/(.)\1{4,}/.test(text)) return true;

    // Check for spam keywords (mots-clés spam)
    const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'click here', 'buy now'];
    const lowerText = text.toLowerCase();
    if (spamKeywords.some(keyword => lowerText.includes(keyword))) return true;

    return false;
  };

  const validate = (): string | null => {
    if (rating === 0) {
      return 'Please select a rating (1-5 stars)';
    }

    if (!author.trim()) {
      return 'Please enter your name or email';
    }

    if (author.length > 100) {
      return 'Author name must be less than 100 characters';
    }

    if (title && title.length > 200) {
      return 'Title must be less than 200 characters';
    }

    if (comment && comment.length > 2000) {
      return 'Comment must be less than 2000 characters';
    }

    // Spam detection (détection de spam)
    const fullText = `${title} ${comment}`;
    if (detectSpam(fullText)) {
      return 'Your review appears to contain spam or inappropriate content';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        pluginId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        author: author.trim()
      });

      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setRating(0);
        setTitle('');
        setComment('');
        setAuthor('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-3xl transition-transform hover:scale-110 focus:outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <span
              className={
                star <= (hoverRating || rating) ? 'text-yellow-500' : 'text-gray-300'
              }
            >
              ★
            </span>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {rating} star{rating !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✓</span>
          <div>
            <h3 className="text-green-800 font-semibold">Review submitted!</h3>
            <p className="text-green-700 text-sm">
              Your review will be visible after moderation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Rating stars */}
      <div className="mb-4">
        <label htmlFor="rating-stars" className="block text-sm font-medium text-gray-700 mb-2">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <div id="rating-stars">{renderStars()}</div>
      </div>

      {/* Author */}
      <div className="mb-4">
        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name or Email <span className="text-red-500">*</span>
        </label>
        <input
          id="author"
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="John Doe or john@example.com"
          maxLength={100}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
            focus:ring-2 focus:ring-blue-500`}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          This will be displayed publicly with your review
        </p>
      </div>

      {/* Title (optional) */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Review Title (Optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
            focus:ring-2 focus:ring-blue-500`}
        />
        <p className="mt-1 text-xs text-gray-500">{title.length}/200 characters</p>
      </div>

      {/* Comment (optional) */}
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
          Your Review (Optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience with this plugin..."
          rows={5}
          maxLength={2000}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none
            focus:ring-2 focus:ring-blue-500 resize-none`}
        />
        <p className="mt-1 text-xs text-gray-500">{comment.length}/2000 characters</p>
      </div>

      {/* Guidelines */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Review Guidelines:</strong> Please be constructive and respectful. Reviews
          containing spam, profanity, or irrelevant content will be rejected.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className={`px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50
              transition-colors disabled:opacity-50`}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
