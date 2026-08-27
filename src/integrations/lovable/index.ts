import { supabase } from "../supabase/client";

interface AuthCallbackResult {
  error?: unknown;
  tokens?: { access_token: string; refresh_token: string };
}

export const lovable = {
  auth: {
    callback: async (result: unknown) => {
      const r = result as AuthCallbackResult;
      if (r.error) {
        return { error: r.error };
      }

      try {
        const supabaseClient = supabase;
        if (!supabaseClient) {
          return { error: new Error("Supabase client not initialized") };
        }

        if (r.tokens) {
          await supabaseClient.auth.setSession(r.tokens);
        }

        // Verify session was stored
        await supabaseClient.auth.getSession();
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return r;
    }
  }
};