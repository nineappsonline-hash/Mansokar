import { createClient } from "@supabase/supabase-js";
const userId = process.argv[2];
if (!/^[a-f0-9-]{36}$/i.test(userId || ""))
  throw Error("Pass the verified Supabase user UUID.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
  throw Error("Server environment variables required");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await db.auth.admin.getUserById(userId);
if (error || !data.user.email_confirmed_at)
  throw Error("A verified user is required");
const { error: insertError } = await db
  .from("admins")
  .upsert({ user_id: userId, enabled: true });
if (insertError) throw insertError;
console.log("Administrator allowlist updated.");
