import { SupabaseClient, createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingSupabaseClient = (clientName: string) =>
  new Proxy({}, {
    get() {
      throw new Error(
        `${clientName} is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`
      );
    },
  }) as SupabaseClient;

const createSupabaseClient = (
  clientName: string,
  url: string | undefined,
  key: string | undefined
) => {
  if (!url || !key) {
    return missingSupabaseClient(clientName);
  }

  try {
    return createClient(url, key);
  } catch (error) {
    console.error(`Could not initialize ${clientName}:`, error);
    return missingSupabaseClient(clientName);
  }
};

// Public client — respects RLS policies
export const supabase = createSupabaseClient('supabase', supabaseUrl, supabaseAnonKey);

// Admin client — bypasses RLS (for server-side operations)
export const supabaseAdmin = createSupabaseClient('supabaseAdmin', supabaseUrl, supabaseServiceKey);
