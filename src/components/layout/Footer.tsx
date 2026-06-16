import { ShieldCheck } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/50 bg-card/30">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary/60" />
          <span>© {currentYear} QBase — Quality Management System</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Active</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/40">v2.5.0</span>
        </div>
      </div>
    </footer>
  );
}