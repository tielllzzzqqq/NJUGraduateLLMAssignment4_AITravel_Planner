import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
// In Docker/production, environment variables are injected directly
// In development, try to load from .env file
const fs = require('fs');
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.DOCKER_CONTAINER === 'true' || fs.existsSync('/.dockerenv');

if (!isProduction && !isDocker) {
  // Development mode: try to load .env file
  const possiblePaths = [
    path.resolve(process.cwd(), '../.env'), // From backend/ directory
    path.resolve(__dirname, '../../../.env'), // From backend/src/config/ (dev) or backend/dist/config/ (prod)
    path.resolve(__dirname, '../../.env'), // Fallback
    path.resolve(process.cwd(), '.env'), // Current directory
  ];

  let envPath = possiblePaths.find(p => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (envPath) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn('Failed to load .env file:', envPath);
      console.warn('Error:', result.error.message);
    } else {
      console.log('Loaded .env file from:', envPath);
    }
  }
} else {
  // Production/Docker: use environment variables directly (no file needed)
  // Environment variables are injected by Docker via env_file or environment
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase credentials not configured');
  console.warn('SUPABASE_URL:', supabaseUrl ? `Set (${supabaseUrl.substring(0, 20)}...)` : 'Missing');
  console.warn('SUPABASE_ANON_KEY:', supabaseAnonKey ? `Set (${supabaseAnonKey.substring(0, 20)}...)` : 'Missing');
  console.warn('__dirname:', __dirname);
  if (isProduction || isDocker) {
    console.warn('Note: In Docker/production, environment variables should be injected by Docker');
  }
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

