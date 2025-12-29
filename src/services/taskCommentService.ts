import { supabase, TABLES } from './supabase';
import type { TaskComment, UserMode } from '../types';

/**
 * Get all comments for a task
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from(TABLES.TASK_COMMENTS)
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching task comments:', error);
    throw error;
  }

  return (data || []).map(mapCommentFromDB);
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  content: string,
  author: UserMode
): Promise<TaskComment> {
  const commentData = {
    task_id: taskId,
    content,
    author,
  };

  const { data, error } = await supabase
    .from(TABLES.TASK_COMMENTS)
    .insert(commentData)
    .select()
    .single();

  if (error) {
    console.error('Error adding task comment:', error);
    throw error;
  }

  return mapCommentFromDB(data);
}

/**
 * Delete a comment
 */
export async function deleteTaskComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.TASK_COMMENTS)
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting task comment:', error);
    throw error;
  }
}

// Helper function to map database row to TaskComment type
function mapCommentFromDB(row: Record<string, unknown>): TaskComment {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    content: row.content as string,
    author: row.author as UserMode,
    createdAt: new Date(row.created_at as string),
  };
}

