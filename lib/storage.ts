import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "cv-assets";

let cached: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

/** Upload a file to the storage bucket and return its public URL. */
export async function uploadToStorage(
  objectPath: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, body, { contentType, upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}
