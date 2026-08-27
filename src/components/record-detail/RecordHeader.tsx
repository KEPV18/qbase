import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecordHeaderProps {
  code: string;
  name: string;
  description: string;
  category: string;
  onRefresh: () => void;
}

export function RecordHeader({ code, name, description, category, onRefresh }: RecordHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between animate-fade-in">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mt-1 hover:bg-primary/10 hover:text-primary transition-all rounded-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-sm bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-bold tracking-wider">
              {code}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-widest">
              {category}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{name}</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xl">{description}</p>
        </div>
      </div>
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        className="border-border/50 hover:bg-primary/5 transition-all rounded-sm font-bold uppercase tracking-widest text-[10px] h-9 px-4 shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Sync
      </Button>
    </div>
  );
}
