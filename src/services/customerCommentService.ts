import { supabase, TABLES } from './supabase';
import type { CustomerComment, UserMode } from '../types';

/**
 * Get all comments for a customer
 */
export async function getCustomerComments(customerId: string): Promise<CustomerComment[]> {
  const { data, error } = await supabase
    .from(TABLES.CUSTOMER_COMMENTS)
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching customer comments:', error);
    throw error;
  }

  return (data || []).map(mapCommentFromDB);
}

/**
 * Add a comment to a customer
 */
export async function addCustomerComment(
  customerId: string,
  content: string,
  author: UserMode
): Promise<CustomerComment> {
  const commentData = {
    customer_id: customerId,
    content,
    author,
  };

  const { data, error } = await supabase
    .from(TABLES.CUSTOMER_COMMENTS)
    .insert(commentData)
    .select()
    .single();

  if (error) {
    console.error('Error adding customer comment:', error);
    throw error;
  }

  return mapCommentFromDB(data);
}

/**
 * Delete a comment
 */
export async function deleteCustomerComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.CUSTOMER_COMMENTS)
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting customer comment:', error);
    throw error;
  }
}

// Helper function to map database row to CustomerComment type
function mapCommentFromDB(row: Record<string, unknown>): CustomerComment {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    content: row.content as string,
    author: row.author as UserMode,
    createdAt: new Date(row.created_at as string),
  };
}

