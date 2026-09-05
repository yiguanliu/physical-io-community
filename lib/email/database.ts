import { Pool } from 'pg';
// Delivery owns a session advisory lock across commits and provider requests.
// Supabase transaction-pooler port 6543 cannot retain that lock; its session
// pooler uses the same host/credentials on 5432. Other proxies require an
// explicitly configured session-mode EMAIL_DATABASE_URL.
const singleton=globalThis as unknown as {emailPool?:Pool};
export function emailDatabase(){
 const raw=process.env.EMAIL_DATABASE_URL||process.env.DATABASE_URL;if(!raw)throw new Error('Database not configured');
 const url=new URL(raw);if(url.port==='6543'&&url.hostname.endsWith('.pooler.supabase.com'))url.port='5432';else if(url.port==='6543'||url.searchParams.get('pgbouncer')==='true')throw new Error('Set EMAIL_DATABASE_URL to a direct or session-pooler connection.');url.searchParams.delete('pgbouncer');
 return singleton.emailPool??=new Pool({connectionString:url.toString(),max:2,connectionTimeoutMillis:10000,statement_timeout:15000});
}
