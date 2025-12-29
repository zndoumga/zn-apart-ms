import { supabase, TABLES } from './supabase';
import { logAction } from './auditService';
import type {
  StaffRequest,
  RequestFormData,
  RequestStatus,
  UserMode,
} from '../types';

/**
 * Get all requests
 */
export async function getRequests(): Promise<StaffRequest[]> {
  const { data, error } = await supabase
    .from(TABLES.REQUESTS)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }

  // Fetch comments for each request
  const requests = await Promise.all(
    (data || []).map(async (row) => {
      const { data: comments } = await supabase
        .from(TABLES.REQUEST_COMMENTS)
        .select('*')
        .eq('request_id', row.id)
        .order('created_at', { ascending: true });

      return mapRequestFromDB(row, comments || []);
    })
  );

  return requests;
}

/**
 * Get requests by status
 */
export async function getRequestsByStatus(status: RequestStatus): Promise<StaffRequest[]> {
  const { data, error } = await supabase
    .from(TABLES.REQUESTS)
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requests by status:', error);
    throw error;
  }

  const requests = await Promise.all(
    (data || []).map(async (row) => {
      const { data: comments } = await supabase
        .from(TABLES.REQUEST_COMMENTS)
        .select('*')
        .eq('request_id', row.id)
        .order('created_at', { ascending: true });

      return mapRequestFromDB(row, comments || []);
    })
  );

  return requests;
}

/**
 * Get a single request by ID
 */
export async function getRequest(id: string): Promise<StaffRequest | null> {
  const { data, error } = await supabase
    .from(TABLES.REQUESTS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching request:', error);
    throw error;
  }

  if (!data) return null;

  const { data: comments } = await supabase
    .from(TABLES.REQUEST_COMMENTS)
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  return mapRequestFromDB(data, comments || []);
}

/**
 * Create a new request
 */
export async function createRequest(
  formData: RequestFormData,
  performedBy: UserMode
): Promise<StaffRequest> {
  const requestData = {
    title: formData.title,
    description: formData.description,
    category: formData.category,
    priority: formData.priority,
    status: 'pending',
    submitted_by: performedBy,
  };

  const { data, error } = await supabase
    .from(TABLES.REQUESTS)
    .insert(requestData)
    .select()
    .single();

  if (error) {
    console.error('Error creating request:', error);
    throw error;
  }

  const request = mapRequestFromDB(data, []);

  await logAction({
    action: 'create',
    entity: 'request',
    entityId: request.id,
    performedBy,
    newData: request,
  });

  return request;
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  performedBy: UserMode
): Promise<StaffRequest> {
  const currentRequest = await getRequest(id);
  if (!currentRequest) {
    throw new Error('Request not found');
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'approved' || status === 'rejected') {
    updateData.resolved_by = performedBy;
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLES.REQUESTS)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating request status:', error);
    throw error;
  }

  const { data: comments } = await supabase
    .from(TABLES.REQUEST_COMMENTS)
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const updatedRequest = mapRequestFromDB(data, comments || []);

  await logAction({
    action: 'update',
    entity: 'request',
    entityId: id,
    performedBy,
    previousData: currentRequest,
    newData: updatedRequest,
  });

  return updatedRequest;
}

/**
 * Add a comment to a request
 */
export async function addComment(
  requestId: string,
  content: string,
  author: UserMode
): Promise<StaffRequest> {
  const { error } = await supabase
    .from(TABLES.REQUEST_COMMENTS)
    .insert({
      request_id: requestId,
      content,
      author,
    });

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  // Update the request's updated_at
  await supabase
    .from(TABLES.REQUESTS)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', requestId);

  const updatedRequest = await getRequest(requestId);
  if (!updatedRequest) {
    throw new Error('Request not found');
  }

  return updatedRequest;
}

/**
 * Delete a request
 */
export async function deleteRequest(
  id: string,
  performedBy: UserMode
): Promise<void> {
  const request = await getRequest(id);
  if (!request) {
    throw new Error('Request not found');
  }

  // Delete comments first
  await supabase
    .from(TABLES.REQUEST_COMMENTS)
    .delete()
    .eq('request_id', id);

  // Delete the request
  const { error } = await supabase
    .from(TABLES.REQUESTS)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting request:', error);
    throw error;
  }

  await logAction({
    action: 'delete',
    entity: 'request',
    entityId: id,
    performedBy,
    previousData: request,
  });
}

// Helper function to map database row to StaffRequest type
function mapRequestFromDB(
  row: Record<string, unknown>,
  comments: Record<string, unknown>[]
): StaffRequest {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as StaffRequest['category'],
    priority: row.priority as StaffRequest['priority'],
    status: row.status as StaffRequest['status'],
    submittedBy: row.submitted_by as UserMode,
    resolvedBy: (row.resolved_by as UserMode) || undefined,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    comments: comments.map((c) => ({
      id: c.id as string,
      content: c.content as string,
      author: c.author as UserMode,
      createdAt: new Date(c.created_at as string),
    })),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
