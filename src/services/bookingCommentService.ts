import { supabase, TABLES } from './supabase';
import type { BookingComment, UserMode } from '../types';

/**
 * Get all comments for a booking
 */
export async function getBookingComments(bookingId: string): Promise<BookingComment[]> {
  const { data, error } = await supabase
    .from(TABLES.BOOKING_COMMENTS)
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching booking comments:', error);
    throw error;
  }

  return (data || []).map(mapCommentFromDB);
}

/**
 * Add a comment to a booking
 */
export async function addBookingComment(
  bookingId: string,
  content: string,
  author: UserMode
): Promise<BookingComment> {
  const commentData = {
    booking_id: bookingId,
    content,
    author,
  };

  const { data, error } = await supabase
    .from(TABLES.BOOKING_COMMENTS)
    .insert(commentData)
    .select()
    .single();

  if (error) {
    console.error('Error adding booking comment:', error);
    throw error;
  }

  return mapCommentFromDB(data);
}

/**
 * Delete a comment
 */
export async function deleteBookingComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.BOOKING_COMMENTS)
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting booking comment:', error);
    throw error;
  }
}

// Helper function to map database row to BookingComment type
function mapCommentFromDB(row: Record<string, unknown>): BookingComment {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    content: row.content as string,
    author: row.author as UserMode,
    createdAt: new Date(row.created_at as string),
  };
}

