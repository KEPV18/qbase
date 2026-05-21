import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("Error");
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none aurora-bg opacity-40" />
      <div className="relative text-center animate-fade-in">
        <p className="text-[120px] md:text-[180px] font-mono font-black text-primary/15 leading-none tracking-tighter text-glow-cyan">
          404
        </p>
        <div className="-mt-8 space-y-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground font-mono">The requested route does not exist in this system.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;