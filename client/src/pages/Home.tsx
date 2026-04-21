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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary border-b border-primary-border pb-8 pt-8 md:pb-12 md:pt-12">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 tracking-normal leading-[1.1] drop-shadow-2xl">
                Lost something?
                <span className="text-white opacity-90"> Let's find it.</span>
              </h1>
              <p className="text-sm md:text-base text-white/80 mb-6 max-w-2xl mx-auto leading-relaxed font-bold">
                Brentwood School's Automated Lost and Found System
              </p>
            </motion.div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <motion.div
                className="relative flex-1 max-w-xl group w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="absolute -inset-2 bg-white/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white rounded-2xl p-2 flex items-center shadow-2xl border border-slate-200">
                  <div className="absolute left-6 pointer-events-none">
                    <Search className="h-6 w-6 text-primary/60" />
                  </div>
                  <Input
                    type="text"
                    placeholder="What are you looking for?"
                    className="pl-14 h-14 text-lg rounded-xl border-none bg-white/50 focus:bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </motion.div>

              <div className="flex gap-4 w-full md:w-auto">
                <motion.div
                  className="flex-1 md:w-32 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-center"
                  whileHover={{ y: -5 }}
                >
                  <div className="text-3xl font-black text-white leading-none mb-1">{stats?.totalItems ?? 0}</div>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Items</div>
                </motion.div>
                <motion.div
                  className="flex-1 md:w-32 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-center"
                  whileHover={{ y: -5 }}
                >
                  <div className="text-3xl font-black text-secondary leading-none mb-1">{stats?.claimedItems ?? 0}</div>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Reunited</div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-20">
        {/* Category Filters */}
        <div className="flex overflow-x-auto pb-4 mb-2 gap-2 scrollbar-none">
          <Button
            variant={selectedCategory === "All" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All")}
            className={cn(
              "rounded-full font-black text-xs shrink-0 shadow-sm transition-all",
              selectedCategory === "All" ? "" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
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
                "rounded-full font-bold text-xs shrink-0 shadow-sm gap-2 transition-all",
                selectedCategory === category ? "" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              )}
            >
              {getCategoryIcon(category)}
              {category}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="found" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-8 bg-white/50 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                  Live Feed
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time status updates</p>
              </div>
            </div>
            <TabsList className="bg-slate-100/80 p-1 rounded-2xl h-auto border border-slate-200/50">
              <TabsTrigger value="found" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-found">Found</TabsTrigger>
              <TabsTrigger value="lost" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-lost">Lost</TabsTrigger>
              <TabsTrigger value="claimed" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-black text-[10px] uppercase tracking-[0.2em]" data-testid="tab-claimed">Claimed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="found" className="mt-0 outline-none">
            {loadingFound ? (
              <ItemGridSkeleton />
            ) : availableFoundItems.length === 0 ? (
              <EmptyState
                title="The box is clear"
                message="No items are currently in the found database. Check back soon."
                icon={<PackageOpen className="w-12 h-12" />}
                type="found"
              />
            ) : (
              <ItemGrid items={availableFoundItems} />
            )}
          </TabsContent>

          <TabsContent value="lost" className="mt-0 outline-none">
            {loadingLost ? (
              <ItemGridSkeleton />
            ) : activeLostItems.length === 0 ? (
              <EmptyState
                title="No active cases"
                message="All lost items have either been found or no reports have been submitted."
                icon={<HelpCircle className="w-12 h-12" />}
                type="lost"
              />
            ) : (
              <ItemGrid items={activeLostItems} />
            )}
          </TabsContent>

          <TabsContent value="claimed" className="mt-0 outline-none">
            {loadingFound ? (
              <ItemGridSkeleton />
            ) : claimedItems.length === 0 ? (
              <EmptyState
                title="History is empty"
                message="Matches will appear here once students claim their items."
                icon={<CheckCircle2 className="w-12 h-12" />}
              />
            ) : (
              <ItemGrid items={claimedItems} />
            )}
          </TabsContent>
        </Tabs>
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
