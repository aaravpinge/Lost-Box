import { format, differenceInDays, addDays } from "date-fns";
import { Item } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, ImageOff, CheckCircle2, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUpdateItemStatus } from "@/hooks/use-items";

interface ItemCardProps {
  item: Item;
  showAdminControls?: boolean;
}

export function ItemCard({ item, showAdminControls }: ItemCardProps) {
  const isFound = item.type === "found";
  const deadline = addDays(new Date(item.dateReported), 30);
  const daysLeft = differenceInDays(deadline, new Date());
  const updateStatus = useUpdateItemStatus();
  
  // Status color mapping
  const statusColors = {
    reported: "bg-blue-50 text-blue-600 border-blue-200",
    retrieved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    donated: "bg-amber-50 text-amber-600 border-amber-200",
    claimed: "bg-indigo-50 text-indigo-600 border-indigo-200"
  };

  const handleClaim = () => {
    const name = window.prompt("Who is claiming this item?");
    if (name) {
      updateStatus.mutate({ id: item.id, status: 'claimed', claimedBy: name });
    }
  };

  return (
    <Card className="group overflow-hidden bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 rounded-2xl">
      <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.description}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <ImageOff className="w-10 h-10 mb-2 opacity-20" />
            <span className="text-xs font-bold uppercase tracking-widest opacity-40">No Image</span>
          </div>
        )}
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <Badge variant="secondary" className={cn("px-3 py-1 font-bold text-[10px] uppercase tracking-wider shadow-sm border", statusColors[item.status as keyof typeof statusColors])}>
            {item.status}
          </Badge>
          {isFound && item.status === 'reported' && (
            <Badge variant="destructive" className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider shadow-sm bg-rose-500 hover:bg-rose-600 border-none">
              {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-none border-none",
            isFound ? "bg-indigo-600 text-white" : "bg-blue-600 text-white"
          )}>
            {item.type}
          </Badge>
          <div className="h-1 w-1 rounded-full bg-slate-300 ml-auto" />
          <span className="text-[11px] font-bold text-slate-400 flex items-center uppercase tracking-wider">
            <Calendar className="w-3 h-3 mr-1 text-slate-400" />
            {format(new Date(isFound ? item.dateFound || item.dateReported : item.dateLost || item.dateReported), "MMM d, yyyy")}
          </span>
        </div>

        <h3 className="font-display font-black text-xl mb-3 text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          {item.description}
        </h3>
        
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 group-hover:bg-blue-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Reporter</span>
              <span className="text-sm font-bold text-slate-700 leading-none">{item.status === 'claimed' ? `${item.claimedBy || 'Unknown'}` : item.contactName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Location</span>
              <span className="text-sm font-bold text-slate-700 leading-none">{item.location}</span>
            </div>
          </div>

          {isFound && item.status === 'reported' && (
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs mt-2 ml-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Deadline: {format(deadline, "MMM d")}</span>
            </div>
          )}
        </div>

        {isFound && item.status === 'reported' && (
          <Button 
            onClick={handleClaim}
            disabled={updateStatus.isPending}
            className="w-full mt-6 h-12 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-blue-500/25 border-none"
            data-testid={`button-claim-${item.id}`}
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Claim Item
          </Button>
        )}
      </div>
    </Card>
  );
}
