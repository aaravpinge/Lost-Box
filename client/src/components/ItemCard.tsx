import { format, differenceInDays, addDays } from "date-fns";
import { Item } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: Item;
  showAdminControls?: boolean;
}

export function ItemCard({ item }: ItemCardProps) {
  const isFound = item.type === "found";
  const deadline = addDays(new Date(item.dateReported), 30);
  const daysLeft = differenceInDays(deadline, new Date());
  
  // Status color mapping
  const statusColors = {
    reported: "bg-blue-100 text-blue-700 hover:bg-blue-100/80",
    retrieved: "bg-green-100 text-green-700 hover:bg-green-100/80",
    donated: "bg-amber-100 text-amber-700 hover:bg-amber-100/80"
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50">
      <div className="aspect-video w-full bg-muted relative overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.description}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <ImageOff className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">No Image</span>
          </div>
        )}
        
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge variant="secondary" className={cn("font-medium capitalize shadow-sm", statusColors[item.status as keyof typeof statusColors])}>
            {item.status}
          </Badge>
          {isFound && item.status === 'reported' && (
            <Badge variant="destructive" className="shadow-sm">
              {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isFound ? "border-secondary text-secondary-foreground bg-secondary/10" : "border-primary text-primary bg-primary/10"
          )}>
            {item.type} Item
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center ml-auto">
            <Calendar className="w-3 h-3 mr-1" />
            {format(new Date(item.dateReported), "MMM d, yyyy")}
          </span>
        </div>

        <h3 className="font-display font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {item.description}
        </h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary/70" />
            <span>{item.location}</span>
          </div>
          {isFound && (
            <div className="flex items-center gap-2 text-amber-600/90 font-medium">
              <Clock className="w-4 h-4" />
              <span>Donation Deadline: {format(deadline, "MMM d")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
