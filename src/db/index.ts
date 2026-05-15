import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// Explicitly import D1Database type from workers-types
import type { D1Database } from "@cloudflare/workers-types";

export function getDb(runtime: 'edge' | 'nodejs' = 'edge') {
  // In Cloudflare, we access D1 via env.DB
  // For local development, wrangler provides a mock
  const dbBinding = (process.env as any).DB as D1Database | undefined;

  if (dbBinding) {
    return drizzle(dbBinding, { schema });
  }
  
  throw new Error('Database binding not found. Ensure you are running in a Cloudflare environment.');
}
