import { BUCKET, getSupabaseAdmin } from '../lib/supabase.js';

export function getStorageClient() {
  return getSupabaseAdmin().storage.from(BUCKET);
}

export function getBucketName() {
  return BUCKET;
}
