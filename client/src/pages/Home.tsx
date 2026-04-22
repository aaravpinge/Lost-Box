import { useState } from "react";
import { useItems } from "@/hooks/use-items";
import { useStats } from "@/hooks/use-stats";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackageOpen, HelpCircle, CheckCircle2, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@shared/schema";
import { Laptop, Shirt, Droplets, Key, Book, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { data: stats } = useStats();
  const { data: foundItems, isLoading: loadingFound } = useItems("found", search);
  const { data: lostItems, isLoading: loadingLost } = useItems("lost", search);

  const claimedItems = foundItems?.filter(item => (item.status === 'claimed' || item.status === 'retrieved') && (selectedCategory === "All" || item.category === selectedCategory)) || [];
  const availableFoundItems = foundItems?.filter(item => item.type === 'found' && item.status !== 'claimed' && item.status !== 'retrieved' && (selectedCategory === "All" || item.category === selectedCategory)) || [];
  const activeLostItems = lostItems?.filter(item => item.type === 'lost' && item.status !== 'claimed' && item.status !== 'retrieved' && (selectedCategory === "All" || item.category === selectedCategory)) || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Electronics": return <Laptop className="w-4 h-4 text-blue-500" />;
      case "Clothing": return <Shirt className="w-4 h-4 text-emerald-500" />;
      case "Water Bottles": return <Droplets className="w-4 h-4 text-cyan-500" />;
      case "Keys": return <Key className="w-4 h-4 text-amber-500" />;
      case "Books": return <Book className="w-4 h-4 text-rose-500" />;
      default: return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Live Feed Section (Moved Up) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                Live Feed
              </h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-14">Brentwood School Lost & Found</p>
          </motion.div>
          
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none w-full md:w-auto">
            <Button
              variant={selectedCategory === "All" ? "default" : "outline"}
              onClick={() => setSelectedCategory("All")}
              className={cn(
                "rounded-xl font-black text-[10px] uppercase tracking-widest shrink-0 shadow-sm transition-all h-10 px-5",
                selectedCategory === "All" ? "shadow-primary/20" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              )}
            >
              All Items
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-xl font-black text-[10px] uppercase tracking-widest shrink-0 shadow-sm gap-2 transition-all h-10 px-5",
                  selectedCategory === category ? "shadow-primary/20" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                )}
              >
                {getCategoryIcon(category)}
                {category}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="found" className="w-full">
          <div className="bg-slate-200/50 p-1.5 rounded-2xl inline-flex mb-8 border border-slate-200">
            <TabsList className="bg-transparent h-auto p-0 gap-2">
              <TabsTrigger value="found" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-found">Found</TabsTrigger>
              <TabsTrigger value="lost" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-500 data-[state=active]:shadow-md transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-lost">Lost</TabsTrigger>
              <TabsTrigger value="claimed" className="px-8 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-500 data-[state=active]:shadow-md transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-claimed">Claimed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="found" className="mt-0 outline-none">
            {loadingFound ? (
              <ItemGridSkeleton />
            ) : availableFoundItems.length === 0 ? (
              <EmptyState title="The box is clear" message="No items are currently in the found database. Check back soon." icon={<PackageOpen className="w-12 h-12" />} type="found" />
            ) : (
              <ItemGrid items={availableFoundItems} />
            )}
          </TabsContent>

          <TabsContent value="lost" className="mt-0 outline-none">
            {loadingLost ? (
              <ItemGridSkeleton />
            ) : activeLostItems.length === 0 ? (
              <EmptyState title="No active cases" message="All lost items have either been found or no reports have been submitted." icon={<HelpCircle className="w-12 h-12" />} type="lost" />
            ) : (
              <ItemGrid items={activeLostItems} />
            )}
          </TabsContent>

          <TabsContent value="claimed" className="mt-0 outline-none">
            {loadingFound ? (
              <ItemGridSkeleton />
            ) : claimedItems.length === 0 ? (
              <EmptyState title="History is empty" message="Matches will appear here once students claim their items." icon={<CheckCircle2 className="w-12 h-12" />} />
            ) : (
              <ItemGrid items={claimedItems} />
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Advanced Search & Stats Section (Moved Down) */}
      <section className="bg-primary py-16 md:py-24 relative overflow-hidden mt-8 md:mt-12 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter drop-shadow-md">
              Looking for something specific?
            </h2>
            <p className="text-sm md:text-base text-white/80 font-bold mb-10">Search across all reported lost, found, and reunited items.</p>
            
            <div className="relative bg-white/10 p-2 rounded-[2rem] flex items-center shadow-2xl border border-white/20 backdrop-blur-xl max-w-3xl mx-auto mb-16 ring-4 ring-white/5">
              <div className="absolute left-6 pointer-events-none">
                <Search className="h-6 w-6 text-white/70" />
              </div>
              <Input
                type="text"
                placeholder="e.g., Blue Hydroflask, Apple Pencil..."
                className="pl-14 h-16 md:h-20 text-lg md:text-xl rounded-2xl border-none bg-transparent text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/30 transition-all font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-row justify-center gap-6">
              <div className="flex-1 md:flex-none md:w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-4xl md:text-5xl font-black text-white leading-none mb-3">{stats?.totalItems ?? 0}</div>
                <div className="text-[10px] font-black text-white/70 uppercase tracking-widest">Active Cases</div>
              </div>
              <div className="flex-1 md:flex-none md:w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="text-4xl md:text-5xl font-black text-secondary leading-none mb-3">{stats?.claimedItems ?? 0}</div>
                <div className="text-[10px] font-black text-secondary/80 uppercase tracking-widest">Reunited</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, message, icon, type }: { title: string, message: string, icon: React.ReactNode, type?: 'found' | 'lost' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center"
    >
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-300 shadow-inner"
      >
        {icon}
      </motion.div>
      <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">{title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">{message}</p>
      {type && (
        <Link href={type === 'found' ? "/report/found" : "/report/lost"}>
          <Button className="rounded-2xl px-10 h-14 bg-primary hover:bg-primary/90 font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-[1.05] active:scale-95">
            Submit a Report
          </Button>
        </Link>
      )}
    </motion.div>
  );
}

function ItemGrid({ items }: { items: any[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: idx * 0.05 }}
        >
          <ItemCard item={item} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function ItemGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-white border border-slate-200">
          <Skeleton className="w-full aspect-[2.2/1] rounded-none bg-slate-200" />
          <div className="p-6">
            <Skeleton className="w-24 h-3 mb-4 rounded-full bg-slate-200" />
            <Skeleton className="w-full h-5 mb-2 rounded-full bg-slate-200" />
            <Skeleton className="w-3/4 h-5 mb-6 rounded-full bg-slate-200" />
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <Skeleton className="w-8 h-8 rounded-xl bg-slate-200" />
                <div className="flex flex-col gap-2 w-full">
                  <Skeleton className="w-16 h-2 rounded-full bg-slate-200" />
                  <Skeleton className="w-24 h-3 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <Skeleton className="w-8 h-8 rounded-xl bg-slate-200" />
                <div className="flex flex-col gap-2 w-full">
                  <Skeleton className="w-16 h-2 rounded-full bg-slate-200" />
                  <Skeleton className="w-32 h-3 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
            <Skeleton className="w-full h-12 mt-6 rounded-xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
