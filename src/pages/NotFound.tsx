import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden grid-bg">
      <div className="absolute inset-0 pointer-events-none aurora-bg opacity-40" />
      <div className="relative text-center animate-fade-in">
        {/* The numeral is a watermark, not a label.  It says nothing the
            heading below it does not already say, so it is hidden from
            assistive technology: a screen reader should read "Page not
            found" once, not "four hundred and four, page not found".
            WCAG 1.4.3 exempts pure decoration, and this is it — the
            heading is the message, the numeral is the shape of it. */}
        <p aria-hidden="true" className="text-[120px] md:text-[180px] font-mono font-black text-primary-tint/15 leading-none tracking-tighter text-glow-cyan">
          404
        </p>
        <div className="-mt-8 space-y-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground font-mono">The requested route does not exist in this system.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-primary/10 border border-primary/20 text-primary-tint font-semibold text-sm hover:bg-primary/20 transition-colors font-mono"
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