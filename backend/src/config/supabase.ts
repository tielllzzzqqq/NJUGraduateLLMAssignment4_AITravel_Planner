import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
// Backend runs from backend/ directory, so .env is one level up
// Try multiple paths to handle both dev and production modes
const possiblePaths = [
  path.resolve(process.cwd(), '../.env'), // From backend/ directory
  path.resolve(__dirname, '../../../.env'), // From backend/src/config/ (dev) or backend/dist/config/ (prod)
  path.resolve(__dirname, '../../.env'), // Fallback
  path.resolve(process.cwd(), '.env'), // Current directory
];

let envPath = possiblePaths.find(p => {
  try {
    const fs = require('fs');
    return fs.existsSync(p);
  } catch {
    return false;
  }
}) || possiblePaths[0]; // Default to first path

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Failed to load .env file:', envPath);
  console.warn('Error:', result.error.message);
} else {
  console.log('Loaded .env file from:', envPath);
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase credentials not configured');
  console.warn('SUPABASE_URL:', supabaseUrl ? `Set (${supabaseUrl.substring(0, 20)}...)` : 'Missing');
  console.warn('SUPABASE_ANON_KEY:', supabaseAnonKey ? `Set (${supabaseAnonKey.substring(0, 20)}...)` : 'Missing');
  console.warn('__dirname:', __dirname);
  console.warn('Resolved .env path:', envPath);
} else {
  console.log('✅ Supabase credentials loaded successfully');
  console.log('SUPABASE_URL:', supabaseUrl.substring(0, 30) + '...');
}

// Only create client if credentials are available
// Use a valid format URL even if placeholder to avoid validation errors
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://temp.supabase.co', 'temp-key');

export const supabaseAdmin = supabaseUrl && (process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey)
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : createClient('https://temp.supabase.co', 'temp-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

