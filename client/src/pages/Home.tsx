import { useState } from "react";
import { useItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackageOpen, HelpCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [search, setSearch] = useState("");
  const { data: foundItems, isLoading: loadingFound } = useItems("found", search);
  const { data: lostItems, isLoading: loadingLost } = useItems("lost", search);

  const claimedItems = foundItems?.filter(item => item.status === 'claimed' || item.status === 'retrieved') || [];
  const availableFoundItems = foundItems?.filter(item => item.type === 'found' && item.status !== 'claimed' && item.status !== 'retrieved') || [];
  const activeLostItems = lostItems?.filter(item => item.type === 'lost' && item.status !== 'claimed' && item.status !== 'retrieved') || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative bg-primary border-b overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white mb-2 tracking-tighter leading-[1.1]">
                Lost something? <br />
                <span className="italic opacity-90">Let's find it.</span>
              </h1>
              <p className="text-base text-white/80 mb-6 max-w-2xl mx-auto leading-relaxed font-medium">
                The official Brentwood School Lost Box.
              </p>
            </motion.div>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
              <motion.div 
                className="relative flex-1 max-w-xl group w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="absolute -inset-1 bg-white/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search for your item..."
                    className="pl-12 h-12 text-base rounded-xl border-none shadow-xl focus:ring-4 focus:ring-white/20 bg-white placeholder:text-slate-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </motion.div>

              <div className="flex gap-3 w-full md:w-auto">
                <div className="flex-1 md:w-28 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                  <div className="text-xl font-black text-white leading-none">{(availableFoundItems.length + activeLostItems.length)}</div>
                  <div className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">Total Items</div>
                </div>
                <div className="flex-1 md:w-28 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                  <div className="text-xl font-black text-white leading-none">{claimedItems.length}</div>
                  <div className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">Items Claimed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-0.5">Search</h3>
                <p className="text-[13px] text-slate-500 leading-tight">Check the dashboard to see if your item was found.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-0.5">Report</h3>
                <p className="text-[13px] text-slate-500 leading-tight">Can't find it? Submit a report so others can help.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-0.5">Claim</h3>
                <p className="text-[13px] text-slate-500 leading-tight">Found a match? Claim it from the front office.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="found" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 bg-white p-5 rounded-3xl border shadow-xl shadow-blue-900/5">
            <div>
              <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-3">
                <div className="w-2.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(0,85,164,0.3)]"></div>
                Dashboard
              </h2>
            </div>
            <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-auto border border-slate-200/50">
              <TabsTrigger value="found" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs" data-testid="tab-found">Found Items</TabsTrigger>
              <TabsTrigger value="lost" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs" data-testid="tab-lost">Lost Items</TabsTrigger>
              <TabsTrigger value="claimed" className="px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-xs" data-testid="tab-claimed">Claimed Items</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="found">
            {loadingFound ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching the box...</p>
              </div>
            ) : availableFoundItems.length === 0 ? (
              <EmptyState 
                title="No found items" 
                message="Try searching for something else or check back later if you lost something." 
                icon={<PackageOpen className="w-10 h-10" />} 
                type="found"
              />
            ) : (
              <ItemGrid items={availableFoundItems} />
            )}
          </TabsContent>

          <TabsContent value="lost">
            {loadingLost ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching reports...</p>
              </div>
            ) : activeLostItems.length === 0 ? (
              <EmptyState 
                title="No lost reports" 
                message="If you found something, please report it to help its owner find it." 
                icon={<HelpCircle className="w-10 h-10" />} 
                type="lost"
              />
            ) : (
              <ItemGrid items={activeLostItems} />
            )}
          </TabsContent>

          <TabsContent value="claimed">
            {loadingFound ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading claimed items...</p>
              </div>
            ) : claimedItems.length === 0 ? (
              <EmptyState title="No claimed items" message="Items will appear here once they've been claimed." icon={<CheckCircle2 className="w-8 h-8 text-muted-foreground" />} />
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
    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-400">
        {icon}
      </div>
      <h3 className="text-2xl font-display font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium leading-relaxed">{message}</p>
      {type && (
        <a href={type === 'found' ? "/report/found" : "/report/lost"}>
          <Button className="rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20">
            Report {type === 'found' ? "Found" : "Lost"} Item
          </Button>
        </a>
      )}
    </div>
  );
}

function ItemGrid({ items }: { items: any[] }) {
  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <ItemCard item={item} />
        </motion.div>
      ))}
    </motion.div>
  );
}
