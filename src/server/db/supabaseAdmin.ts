import { createClient } from "@supabase/supabase-js";
import { env } from "../env.ts";

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "X-Client-Info": "InvoiceSync-OCR-Service",
      },
    },
  },
);


