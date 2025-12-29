import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type { Task, TaskFormData, TaskStatus, UserMode } from '../types';

// Helper to convert string or Date to ISO string
function toISOString(value: string | Date | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

/**
 * Get all tasks
 */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return (data || []).map(mapTaskFromDB);
}

/**
 * Get tasks by property ID
 */
export async function getTasksByProperty(propertyId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by property:', error);
    throw error;
  }

  return (data || []).map(mapTaskFromDB);
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks by status:', error);
    throw error;
  }

  return (data || []).map(mapTaskFromDB);
}

/**
 * Get a single task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching task:', error);
    throw error;
  }

  return data ? mapTaskFromDB(data) : null;
}

/**
 * Create a new task
 */
export async function createTask(
  formData: TaskFormData,
  performedBy: UserMode
): Promise<Task> {
  const taskData = {
    property_id: formData.propertyId || null,
    title: formData.title,
    description: formData.description || null,
    status: 'todo',
    priority: formData.priority,
    assigned_to: formData.assignedTo || null,
    due_date: toISOString(formData.dueDate),
  };

  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .insert(taskData)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  const task = mapTaskFromDB(data);

  await logAction({
    action: 'create',
    entity: 'task',
    entityId: task.id,
    performedBy,
    newData: task,
  });

  return task;
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  formData: Partial<TaskFormData>,
  performedBy: UserMode
): Promise<Task> {
  const currentTask = await getTask(id);
  if (!currentTask) {
    throw new Error('Task not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.propertyId !== undefined) updateData.property_id = formData.propertyId;
  if (formData.title !== undefined) updateData.title = formData.title;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.priority !== undefined) updateData.priority = formData.priority;
  if (formData.assignedTo !== undefined) updateData.assigned_to = formData.assignedTo;
  if (formData.dueDate !== undefined) updateData.due_date = toISOString(formData.dueDate);

  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  const updatedTask = mapTaskFromDB(data);

  await logAction({
    action: 'update',
    entity: 'task',
    entityId: id,
    performedBy,
    previousData: currentTask,
    newData: updatedTask,
  });

  return updatedTask;
}

/**
 * Update task status (for Kanban board)
 */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  performedBy: UserMode
): Promise<Task> {
  const currentTask = await getTask(id);
  if (!currentTask) {
    throw new Error('Task not found');
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set completed_at when marking as done
  if (status === 'done') {
    updateData.completed_at = new Date().toISOString();
  } else {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from(TABLES.TASKS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task status:', error);
    throw error;
  }

  const updatedTask = mapTaskFromDB(data);

  await logAction({
    action: 'update',
    entity: 'task',
    entityId: id,
    performedBy,
    previousData: currentTask,
    newData: updatedTask,
  });

  return updatedTask;
}

/**
 * Delete a task
 */
export async function deleteTask(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const task = await getTask(id);
  if (!task) {
    throw new Error('Task not found');
  }

  const { error } = await supabase
    .from(TABLES.TASKS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'task',
    entityId: id,
    performedBy,
    previousData: task,
  });
}

// Helper function to map database row to Task type
function mapTaskFromDB(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    propertyId: (row.property_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assignedTo: (row.assigned_to as Task['assignedTo']) || undefined,
    dueDate: row.due_date ? new Date(row.due_date as string) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
