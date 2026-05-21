import { supabase } from "../supabase/client";

export const lovable = {
  auth: {
    callback: async (result: unknown) => {
      if (result.error) {
        return { error: result.error };
      }

      try {
        const supabaseClient = supabase;
        if (!supabaseClient) {
          return { error: new Error("Supabase client not initialized") };
        }

        await supabaseClient.auth.setSession(result.tokens);

        // Verify session was stored
        await supabaseClient.auth.getSession();
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    }
  }
};
