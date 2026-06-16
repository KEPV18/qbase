import { FileText, FolderOpen, ExternalLink } from "lucide-react";

interface DocumentLinksProps {
  templateLink?: string;
  folderLink?: string;
}

export function DocumentLinks({ templateLink, folderLink }: DocumentLinksProps) {
  return (
    <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-info" />
        Quick Access
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LinkCard
          href={templateLink}
          icon={FileText}
          title="Master Template"
          subtitle="Source Document"
          accentClass="text-primary bg-primary/10"
          hoverClass="hover:border-primary/40 hover:bg-primary/5"
        />
        <LinkCard
          href={folderLink}
          icon={FolderOpen}
          title="Record Vault"
          subtitle="File Repository"
          accentClass="text-info bg-info/10"
          hoverClass="hover:border-info/40 hover:bg-info/5"
        />
      </div>
    </div>
  );
}

function LinkCard({
  href,
  icon: Icon,
  title,
  subtitle,
  accentClass,
  hoverClass,
}: {
  href?: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accentClass: string;
  hoverClass: string;
}) {
  if (!href) {
    return (
      <div className="p-4 rounded-sm bg-muted/30 border border-dashed border-border/50 text-center flex flex-col items-center justify-center gap-1 opacity-50">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Not Available</p>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-4 rounded-sm bg-card border border-border/50 transition-all group/link ${hoverClass}`}
    >
      <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 group-hover/link:scale-105 transition-transform ${accentClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm">{title}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">{subtitle}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-30 group-hover/link:opacity-80 transition-opacity" />
    </a>
  );
}
