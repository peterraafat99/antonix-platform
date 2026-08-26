import{createBrowserClient}from"@supabase/ssr";import type{Database}from"@/lib/database.types";import{getPublicEnv}from"@/lib/env";
export function createClient(){const e=getPublicEnv();return createBrowserClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL,e.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
