/**
 * RatingService - Client for rating system using Supabase
 * Wrapper autour du service Supabase existant pour réutiliser l'infrastructure en place
 */

import type { Rating, RatingStatsData, SubmitRatingData, RatingFilters } from './types';
import {
  getPluginRatings as supabaseGetRatings,
  submitPluginRating as supabaseSubmitRating,
  getPluginRatingsAggregate as supabaseGetAggregate,
  approveRating as supabaseApproveRating,
  rejectRating as supabaseRejectRating,
  getUnapprovedRatings as supabaseGetUnapproved,
  type PluginRating as SupabasePluginRating
} from '../../../apps/web/src/services/supabaseClient';

/**
 * Convertir PluginRating Supabase → Rating (notre interface)
 */
function convertSupabaseRating(supabaseRating: SupabasePluginRating): Rating {
  return {
    id: supabaseRating.id || '',
    pluginId: supabaseRating.pluginId,
    rating: supabaseRating.rating,
    title: undefined, // Supabase n'a pas de title séparé
    comment: supabaseRating.comment || undefined,
    author: supabaseRating.userName,
    helpful: 0, // TODO: implémenter helpful/unhelpful dans Supabase
    unhelpful: 0,
    status: 'approved', // TODO: mapper is_approved → status
    createdAt: supabaseRating.created_at || new Date().toISOString(),
    moderatedAt: undefined,
    moderationNotes: undefined
  };
}

export class RatingService {
  constructor() {
    // No config needed - Supabase client is configured globally
  }

  /**
   * Submit a new rating for a plugin (soumettre un nouveau rating)
   */
  async submitRating(data: SubmitRatingData): Promise<Rating> {
    const success = await supabaseSubmitRating(
      data.pluginId,
      data.author,
      data.rating,
      data.comment || '',
      undefined // email optional
    );

    if (!success) {
      throw new Error('Failed to submit rating to Supabase');
    }

    // Return a mock rating (Supabase doesn't return the created rating)
    return {
      id: 'pending', // Will be assigned by Supabase
      pluginId: data.pluginId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      author: data.author,
      helpful: 0,
      unhelpful: 0,
      status: 'pending', // Ratings start as pending in Supabase
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get ratings for a plugin with filters (récupérer les ratings avec filtres)
   */
  async getRatings(
    pluginId: string,
    filters?: RatingFilters
  ): Promise<{ ratings: Rating[]; total: number; page: number; pages: number }> {
    const supabaseRatings = await supabaseGetRatings(pluginId);

    // Convert Supabase ratings to our Rating interface
    let ratings = supabaseRatings.map(convertSupabaseRating);

    // Apply filters
    if (filters?.sort === 'rating') {
      ratings = ratings.sort((a, b) => b.rating - a.rating);
    } else if (filters?.sort === 'helpful') {
      ratings = ratings.sort((a, b) => b.helpful - a.helpful);
    } else {
      // Default: recent (already sorted by created_at DESC from Supabase)
    }

    // Simple pagination (client-side for now)
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRatings = ratings.slice(startIndex, endIndex);

    return {
      ratings: paginatedRatings,
      total: ratings.length,
      page,
      pages: Math.ceil(ratings.length / limit)
    };
  }

  /**
   * Get rating statistics for a plugin (récupérer les statistiques de rating)
   */
  async getRatingStats(pluginId: string): Promise<RatingStatsData> {
    const aggregate = await supabaseGetAggregate(pluginId);

    // Convert Supabase aggregate to our RatingStats interface
    return {
      totalCount: aggregate.totalRatings,
      averageRating: aggregate.averageRating,
      distribution: [
        aggregate.breakdown.onestar,
        aggregate.breakdown.twostar,
        aggregate.breakdown.threestar,
        aggregate.breakdown.fourstar,
        aggregate.breakdown.fivestar
      ],
      lastRatingDate: undefined // Supabase doesn't track this yet
    };
  }

  /**
   * Mark a rating as helpful or unhelpful (marquer un rating comme utile/inutile)
   * TODO: Implémenter dans Supabase (nécessite nouvelle table helpful_votes)
   */
  async markHelpful(ratingId: string, helpful: boolean): Promise<{ helpful: number; unhelpful: number }> {
    // Not implemented in Supabase yet - return mock data
    console.warn('[RatingService] markHelpful not yet implemented in Supabase');
    return { helpful: 0, unhelpful: 0 };
  }

  /**
   * Report a rating as inappropriate (signaler un rating inapproprié)
   * TODO: Implémenter dans Supabase (nécessite table reports)
   */
  async reportRating(ratingId: string, reason: string, reporter: string): Promise<void> {
    console.warn('[RatingService] reportRating not yet implemented in Supabase');
    // Not implemented yet
  }

  /**
   * Moderate a rating (approve or reject) - Admin only (modérer un rating - Admin uniquement)
   */
  async moderateRating(
    ratingId: string,
    approved: boolean,
    reason?: string
  ): Promise<Rating> {
    const success = approved
      ? await supabaseApproveRating(ratingId)
      : await supabaseRejectRating(ratingId);

    if (!success) {
      throw new Error(`Failed to ${approved ? 'approve' : 'reject'} rating`);
    }

    // Return mock rating (Supabase doesn't return the updated rating)
    return {
      id: ratingId,
      pluginId: '', // Not available
      rating: 0,
      author: '',
      helpful: 0,
      unhelpful: 0,
      status: approved ? 'approved' : 'rejected',
      createdAt: new Date().toISOString(),
      moderatedAt: new Date().toISOString(),
      moderationNotes: reason
    };
  }

  /**
   * Get pending ratings for moderation - Admin only (récupérer ratings en attente - Admin)
   */
  async getPendingRatings(
    page: number = 1,
    limit: number = 20
  ): Promise<{ ratings: Rating[]; total: number; page: number; pages: number }> {
    const unapprovedRatings = await supabaseGetUnapproved();

    // Convert to our Rating interface
    const ratings = unapprovedRatings.map(convertSupabaseRating);

    // Simple pagination (client-side)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRatings = ratings.slice(startIndex, endIndex);

    return {
      ratings: paginatedRatings,
      total: ratings.length,
      page,
      pages: Math.ceil(ratings.length / limit)
    };
  }

  /**
   * Delete a rating - Admin only (supprimer un rating - Admin uniquement)
   */
  async deleteRating(ratingId: string): Promise<void> {
    const success = await supabaseRejectRating(ratingId); // rejectRating = delete in Supabase

    if (!success) {
      throw new Error('Failed to delete rating');
    }
  }
}
