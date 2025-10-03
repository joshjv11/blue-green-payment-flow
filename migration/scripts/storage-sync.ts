import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '../.env.old' });
const OLD_URL = process.env.OLD_SUPABASE_URL!;
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY!;

dotenv.config({ path: '../.env.new' });
const NEW_URL = process.env.NEW_SUPABASE_URL!;
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY!;

const PARALLEL = parseInt(process.env.STORAGE_PARALLEL_DOWNLOADS || '10');

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

interface StorageFile {
  name: string;
  bucket_id: string;
  id: string;
  metadata: any;
}

async function listBuckets() {
  console.log('→ Listing buckets from OLD project...');
  const { data, error } = await oldSupabase.storage.listBuckets();
  
  if (error) {
    console.error('ERROR:', error);
    throw error;
  }
  
  console.log(`  ✓ Found ${data.length} buckets`);
  return data;
}

async function listFilesInBucket(bucketId: string): Promise<StorageFile[]> {
  console.log(`  → Listing files in bucket: ${bucketId}`);
  
  const { data, error } = await oldSupabase.storage
    .from(bucketId)
    .list('', {
      limit: 10000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
  
  if (error) {
    console.error(`    ✗ Error: ${error.message}`);
    return [];
  }
  
  console.log(`    ✓ Found ${data.length} files`);
  return data.map(f => ({ ...f, bucket_id: bucketId }));
}

async function createBucketIfNotExists(bucketId: string, isPublic: boolean) {
  const { data: buckets } = await newSupabase.storage.listBuckets();
  const exists = buckets?.some(b => b.id === bucketId);
  
  if (exists) {
    console.log(`    ✓ Bucket "${bucketId}" already exists`);
    return;
  }
  
  console.log(`  → Creating bucket: ${bucketId} (public: ${isPublic})`);
  const { error } = await newSupabase.storage.createBucket(bucketId, {
    public: isPublic,
    fileSizeLimit: 52428800 // 50MB
  });
  
  if (error) {
    console.error(`    ✗ Error creating bucket: ${error.message}`);
  } else {
    console.log(`    ✓ Bucket created`);
  }
}

async function copyFile(file: StorageFile) {
  const { bucket_id, name } = file;
  
  try {
    // Download from OLD
    const { data: blob, error: downloadError } = await oldSupabase.storage
      .from(bucket_id)
      .download(name);
    
    if (downloadError) {
      console.error(`    ✗ Download failed: ${name} - ${downloadError.message}`);
      return false;
    }
    
    // Upload to NEW
    const { error: uploadError } = await newSupabase.storage
      .from(bucket_id)
      .upload(name, blob, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`    ✗ Upload failed: ${name} - ${uploadError.message}`);
      return false;
    }
    
    return true;
  } catch (err: any) {
    console.error(`    ✗ Exception: ${name} - ${err.message}`);
    return false;
  }
}

async function syncBucket(bucketId: string, isPublic: boolean) {
  console.log(`\n→ Syncing bucket: ${bucketId}`);
  
  await createBucketIfNotExists(bucketId, isPublic);
  
  const files = await listFilesInBucket(bucketId);
  
  if (files.length === 0) {
    console.log('  → No files to sync');
    return { success: 0, failed: 0 };
  }
  
  console.log(`  → Copying ${files.length} files (${PARALLEL} parallel)...`);
  
  let success = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < files.length; i += PARALLEL) {
    const batch = files.slice(i, i + PARALLEL);
    const results = await Promise.all(batch.map(f => copyFile(f)));
    
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;
    
    const progress = Math.min(i + PARALLEL, files.length);
    console.log(`    Progress: ${progress}/${files.length} (${success} success, ${failed} failed)`);
  }
  
  console.log(`  ✓ Bucket synced: ${success} success, ${failed} failed`);
  return { success, failed };
}

async function main() {
  console.log('========================================');
  console.log('Storage Sync: OLD → NEW');
  console.log('========================================\n');
  
  try {
    const buckets = await listBuckets();
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const bucket of buckets) {
      const { success, failed } = await syncBucket(bucket.id, bucket.public);
      totalSuccess += success;
      totalFailed += failed;
    }
    
    console.log('\n========================================');
    console.log('✓ Storage sync complete');
    console.log(`  Total files: ${totalSuccess + totalFailed}`);
    console.log(`  Success: ${totalSuccess}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log('========================================\n');
    
    // Save manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      buckets: buckets.map(b => b.id),
      total_files: totalSuccess + totalFailed,
      success: totalSuccess,
      failed: totalFailed
    };
    
    fs.writeFileSync(
      path.join('../exports/storage/manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
  } catch (error: any) {
    console.error('\nFATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
