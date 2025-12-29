import { supabase, BUCKETS } from './supabase';

/**
 * Check if a file is a valid image type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  bucket: keyof typeof BUCKETS,
  folder: string
): Promise<string> {
  const bucketName = BUCKETS[bucket];
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  bucket: keyof typeof BUCKETS,
  folder: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadFile(file, bucket, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  fileUrl: string,
  bucket: keyof typeof BUCKETS
): Promise<void> {
  const bucketName = BUCKETS[bucket];
  
  // Extract file path from URL
  const urlParts = fileUrl.split(`${bucketName}/`);
  if (urlParts.length < 2) {
    console.warn('Could not extract file path from URL:', fileUrl);
    return;
  }
  
  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  fileUrls: string[],
  bucket: keyof typeof BUCKETS
): Promise<void> {
  const deletePromises = fileUrls.map((url) => deleteFile(url, bucket));
  await Promise.all(deletePromises);
}
