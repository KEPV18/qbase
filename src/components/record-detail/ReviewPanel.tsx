import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, User, CalendarDays } from "lucide-react";

interface ReviewPanelProps {
  reviewed: boolean;
  reviewedBy: string;
  reviewDate: string;
  onReviewedChange: (checked: boolean) => void;
  onSave: (reviewedBy: string, reviewDate: string) => Promise<void>;
}

export function ReviewPanel({ reviewed, reviewedBy, reviewDate, onReviewedChange, onSave }: ReviewPanelProps) {
  const [localReviewedBy, setLocalReviewedBy] = useState(reviewedBy);
  const [localReviewDate, setLocalReviewDate] = useState(reviewDate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localReviewedBy, localReviewDate);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-sm border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-5 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        Review Details
      </h2>

      <div className="space-y-5">
        <div
          className={`flex items-center gap-3 p-3.5 rounded-sm border transition-colors ${
            reviewed ? "bg-success/5 border-success/20" : "bg-muted/30 border-border/50"
          }`}
        >
          <Checkbox
            id="reviewed"
            checked={reviewed}
            onCheckedChange={onReviewedChange}
            className="w-5 h-5 rounded-md border-primary/30 data-[state=checked]:bg-primary"
          />
          <Label htmlFor="reviewed" className="cursor-pointer text-sm font-bold text-foreground/80 flex-1">
            Formally Reviewed
          </Label>
          {reviewed && (
            <span className="text-[10px] font-bold text-success uppercase tracking-wider">✓ Complete</span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reviewedBy" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Reviewed By
          </Label>
          <Input
            id="reviewedBy"
            value={localReviewedBy}
            onChange={(e) => setLocalReviewedBy(e.target.value)}
            placeholder="Enter reviewer name"
            className="h-10 rounded-sm bg-background border-border/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reviewDate" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" />
            Review Date
          </Label>
          <Input
            id="reviewDate"
            type="date"
            value={localReviewDate}
            onChange={(e) => setLocalReviewDate(e.target.value)}
            className="h-10 rounded-sm bg-background border-border/50"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-11 rounded-sm font-bold tracking-widest uppercase text-[10px] transition-all shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Review
        </Button>
      </div>
    </div>
  );
}
