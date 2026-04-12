import { useState } from "react";
import { useItems, useUpdateItemStatus, useDeleteItem } from "@/hooks/use-items";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  CheckCircle,
  Archive,
  Trash2,
  Search,
  Loader2,
  Filter,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Admin() {
  const { user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data: items, isLoading: itemsLoading } = useItems(undefined, search);
  const updateStatus = useUpdateItemStatus();
  const deleteItem = useDeleteItem();

  // Redirect if not logged in or not an admin
  if (!userLoading && (!user || user.isAdmin !== "true")) {
    setLocation(user ? "/" : "/auth");
    return null;
  }

  if (userLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = (id: number, status: 'retrieved' | 'donated') => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteItem.mutate(id);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'reported': return 'secondary';
      case 'retrieved': return 'default'; // Using default for success-like green in our theme
      case 'donated': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <section className="mesh-gradient py-12 px-8 border-b border-primary-border relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <Badge className="bg-secondary text-white border-none mb-4 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg">
              Authorized Personnel Only
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-white text-glow tracking-tighter mb-2">
              Command Center
            </h1>
            <p className="text-white/70 font-medium text-lg">
              Managing {items?.length || 0} reports in the system.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-4 text-white/40 group-focus-within:text-white transition-colors" />
              <Input
                placeholder="Search database..."
                className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-2xl w-full md:w-80 backdrop-blur-md focus:bg-white focus:text-slate-900 focus:ring-4 focus:ring-white/20 transition-all text-lg font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto p-8 relative z-20">
        <Card className="glass border-white/40 shadow-2xl rounded-3xl overflow-hidden min-h-[600px]">
          <Tabs defaultValue="all" className="w-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                <TabsTrigger value="all" className="rounded-lg px-6 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm">All Reports</TabsTrigger>
                <TabsTrigger value="lost" className="rounded-lg px-6 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm">Lost Reports</TabsTrigger>
                <TabsTrigger value="found" className="rounded-lg px-6 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm">Found Items</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-none">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Information</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Origin</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Guardian</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Status</TableHead>
                      <TableHead className="text-right py-6 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items?.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-slate-50/80 transition-all border-slate-100 h-24">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-2 h-10 rounded-full shrink-0",
                              item.type === 'found' ? "bg-primary shadow-[0_0_10px_rgba(0,85,164,0.3)]" : "bg-secondary shadow-[0_0_10px_rgba(183,18,52,0.3)]"
                            )} />
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 group-hover:text-primary transition-colors text-lg tracking-tight leading-none mb-1">
                                {item.description}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-0.5 rounded-md bg-slate-100">
                                  {item.type}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">
                                  Ref: #{item.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 mb-0.5 tracking-tight">{item.location}</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(item.dateReported), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${item.contactEmail}`}
                            className="flex flex-col group/email"
                          >
                            <span className="text-sm font-black text-slate-700 group-hover/email:text-primary transition-colors">{item.contactName}</span>
                            <span className="text-[10px] font-bold text-slate-400 group-hover/email:underline">{item.contactEmail}</span>
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm",
                            item.status === 'retrieved' ? "bg-emerald-500 text-white" :
                              item.status === 'donated' ? "bg-amber-500 text-white" :
                                "bg-slate-200 text-slate-600"
                          )}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-200 transition-all">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-200 shadow-2xl min-w-[180px]">
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Workflow Actions</div>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: item.id, status: 'retrieved', claimedBy: 'Student' })}
                                className="rounded-xl py-3 cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 font-bold text-xs"
                              >
                                <CheckCircle className="mr-3 h-4 w-4" />
                                Confirm Reunion (Student)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: item.id, status: 'retrieved', claimedBy: 'Faculty' })}
                                className="rounded-xl py-3 cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 font-bold text-xs"
                              >
                                <CheckCircle className="mr-3 h-4 w-4" />
                                Confirm Reunion (Faculty)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(item.id, 'donated')}
                                className="rounded-xl py-3 cursor-pointer focus:bg-amber-50 focus:text-amber-600 font-bold text-xs"
                              >
                                <Archive className="mr-3 h-4 w-4" />
                                Record Donation
                              </DropdownMenuItem>
                              <div className="h-px bg-slate-100 my-2" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(item.id)}
                                className="rounded-xl py-3 cursor-pointer focus:bg-rose-50 focus:text-rose-600 font-bold text-xs text-rose-500"
                              >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Permanent Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">No matching records found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
