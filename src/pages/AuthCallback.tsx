import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        toast.error("Error", { description: "Authentication service not available" });
        navigate("/login");
        return;
      }

      try {
        // Check for tokens in the URL (Lovable Bridge flow)
        const params = new URLSearchParams(location.search);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const result = await lovable.auth.callback({
            tokens: { access_token: accessToken, refresh_token: refreshToken }
          });

          if (result.error) {
            throw result.error;
          }
        }

        // Check if we have a session (Standard flow or after Bridge setting)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.error("Error");
          toast.error("Authentication Failed", { description: "Could not complete authentication" });
          navigate("/login");
          return;
        }

        // The auth state change listener in useAuth will handle profile creation
        toast.success("Success", { description: "Successfully signed in with Google" });
        navigate("/");

      } catch (error) {
        console.error("Error");
        toast.error("Error", { description: "An error occurred during authentication" });
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none aurora-bg opacity-40" />
      <Card className="w-full max-w-md shadow-xl border-neon-cyan/10 rounded-sm bg-card/95 backdrop-blur-xl accent-line-top relative">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-neon-cyan/10 rounded-sm flex items-center justify-center mx-auto mb-4 border border-neon-cyan/20 animate-glow-pulse">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-none animate-spin"></div>
          </div>
          <CardTitle className="text-2xl text-foreground font-mono">Completing Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm font-mono">Verifying credentials...</p>
        </CardContent>
      </Card>
    </div>
  );
}