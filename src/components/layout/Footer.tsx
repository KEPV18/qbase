import { ShieldCheck, Settings, Phone } from "lucide-react";
import { useState } from "react";
import pkg from "../../../package.json";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showPhone, setShowPhone] = useState(false);

  return (
    <footer className="w-full mt-auto border-t border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground/70 font-medium">
                © {currentYear} Vezloo QMS · ISO 9001:2015
              </span>
            </div>
            <div className="h-4 w-[1px] bg-border/20 hidden md:block" />
            <div className="text-[11px] text-muted-foreground/60">
              Site developed by{" "}
              <button 
                onClick={() => setShowPhone(!showPhone)}
                className="text-primary hover:text-primary/80 font-semibold transition-colors decoration-dotted underline underline-offset-4"
              >
                Ahmed Khaled
              </button>
              {showPhone ? (
                <span className="ml-2 inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-sm animate-fade-in">
                  <Phone className="w-2.5 h-2.5" />
                  01121199859
                </span>
              ) : (
                <span className="ml-2 italic text-[10px] text-muted-foreground/40 hidden lg:inline">
                  (If you have a problem, contact him)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wider uppercase">System Active</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 bg-muted/30 px-2 py-0.5 rounded-md">
              <Settings className="w-2.5 h-2.5" />
              <span>v{pkg.version}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
