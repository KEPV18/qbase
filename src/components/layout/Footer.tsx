import { ShieldCheck, Settings, Phone } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showPhone, setShowPhone] = useState(false);

  return (
    <footer className="w-full border-t border-border/30 bg-card/20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
          <span>© {currentYear} Vezloo QMS</span>
          <div className="h-3 w-[1px] bg-border/20 hidden sm:block" />
          <span>
            by{" "}
            <button
              onClick={() => setShowPhone(!showPhone)}
              className="text-primary/70 hover:text-primary font-medium transition-colors"
            >
              Ahmed Khaled
            </button>
            {showPhone && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-primary/70 text-[10px]">
                <Phone className="w-2.5 h-2.5" /> 01121199859
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Active</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/30">v2.5.0</span>
        </div>
      </div>
    </footer>
  );
}