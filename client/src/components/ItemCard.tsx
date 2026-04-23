import { useState } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { Item } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Mail, ImageOff, CheckCircle2, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUpdateItemStatus } from "@/hooks/use-items";

interface ItemCardProps {
  item: Item;
  showAdminControls?: boolean;
}

export function ItemCard({ item, showAdminControls }: ItemCardProps) {
  const isFound = item.type === "found";
  const baseDate = isFound ? (item.dateFound || item.dateReported) : (item.dateLost || item.dateReported);
  const deadline = addDays(new Date(baseDate), 30);
  const daysLeft = differenceInDays(deadline, new Date());
  const updateStatus = useUpdateItemStatus();

  // Status color mapping
  const statusColors = {
    reported: "bg-blue-50 text-blue-600 border-blue-200",
    retrieved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    donated: "bg-amber-50 text-amber-600 border-amber-200",
    claimed: "bg-indigo-50 text-indigo-600 border-indigo-200"
  };

  const [claimName, setClaimName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const submitClaim = () => {
    if (claimName.trim()) {
      updateStatus.mutate({ id: item.id, status: 'claimed', claimedBy: claimName.trim() }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setClaimName("");
        }
      });
    }
  };

  return (
    <Card className="group overflow-hidden bg-white border-slate-200 hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(209,100,52,0.1)] transition-all duration-500 rounded-2xl relative">

      <div className="aspect-[2.2/1] w-full bg-slate-100 relative overflow-hidden">
        {item.imageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <img
                src={item.imageUrl}
                alt={item.description}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-zoom-in"
              />
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-none bg-transparent shadow-none p-0 flex justify-center items-center">
              <img 
                src={item.imageUrl} 
                alt={item.description} 
                className="w-full max-h-[85vh] object-contain drop-shadow-2xl rounded-2xl" 
              />
            </DialogContent>
          </Dialog>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 border-b">
            <ImageOff className="w-10 h-10 mb-2 text-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">No Image Preview</span>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <Badge variant="outline" className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider shadow-lg border-white/50 bg-white/80 backdrop-blur-md text-slate-700">
            {item.category || "Other"}
          </Badge>

          {isFound && item.status === 'reported' && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-white/40 text-rose-600 border border-rose-200 shadow-sm transition-all group-hover:bg-rose-500 group-hover:text-white">
              {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
            <Calendar className="w-3 h-3 mr-1.5 text-primary/40" />
            {format(new Date(baseDate), "MMMM d, yyyy")}
          </span>
        </div>

        <h3 className="font-black text-xl mb-1 text-slate-900 group-hover:text-primary transition-colors line-clamp-1 leading-[1.2]">
          {item.description}
        </h3>

        {item.additionalDetails && (
          <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {item.additionalDetails}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-primary/5 flex items-center justify-center shrink-0 transition-colors border">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Location</span>
              <span className="text-sm font-bold text-slate-700 truncate">{item.location}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-secondary/5 flex items-center justify-center shrink-0 transition-colors border">
              <User className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {item.status === 'claimed' ? 'Claimed By' : 'Staff'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 truncate">
                  {item.status === 'claimed' ? item.claimedBy : item.contactName}
                </span>
                {item.status !== 'claimed' && (
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="p-1.5 rounded-lg bg-secondary/5 text-secondary hover:bg-secondary hover:text-white transition-all shadow-sm"
                  >
                    <Mail className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {isFound && item.status === 'reported' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={updateStatus.isPending}
                className="w-full mt-6 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl shadow-primary/20 hover:shadow-primary/40 border-none active:scale-[0.98]"
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Claim Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl bg-white border-slate-200 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-black text-xl text-slate-800">Confirm Claim</DialogTitle>
                <DialogDescription className="font-medium text-slate-500 text-sm">
                  Please enter the name of the student or staff member claiming this item.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50 text-sm font-bold focus:-translate-y-0.5 transition-transform"
                  placeholder="Student or Staff Name"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitClaim()}
                />
              </div>
              <DialogFooter className="sm:justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl font-bold hover:bg-slate-50 border-slate-200 transition-all"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={submitClaim}
                  disabled={!claimName.trim() || updateStatus.isPending}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs transition-all hover:-translate-y-0.5 active:scale-95 shadow-xl shadow-primary/20"
                >
                  {updateStatus.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
}
