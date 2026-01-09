import { useState } from "react";
import { useItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackageOpen, HelpCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <section className="relative bg-slate-900 border-b overflow-hidden">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,85,164,0.3),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,85,164,0.1),transparent_50%)]" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black text-white mb-8 tracking-tighter leading-[1.1]">
                Lost something? <br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent italic">Let's find it.</span>
              </h1>
              <p className="text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                The official Brentwood School Lost Box. Connecting lost items with their owners through a modern, efficient tracking system.
              </p>
            </motion.div>
            
            <motion.div 
              className="relative max-w-2xl mx-auto group"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-blue-500" />
                </div>
                <Input
                  type="text"
                  placeholder="Search for your item (e.g., 'Hydro Flask', 'Pencil Case')..."
                  className="pl-14 h-16 text-xl rounded-2xl border-none shadow-2xl focus:ring-4 focus:ring-blue-500/20 bg-white placeholder:text-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="found" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 bg-white p-6 rounded-3xl border shadow-xl shadow-blue-900/5">
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 flex items-center gap-3">
                <div className="w-3 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(0,85,164,0.3)]"></div>
                Dashboard
              </h2>
              <p className="text-slate-500 text-sm mt-1 ml-6 font-medium">Browse reported items by status</p>
            </div>
            <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-auto border border-slate-200/50">
              <TabsTrigger value="found" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-sm" data-testid="tab-found">Found Items</TabsTrigger>
              <TabsTrigger value="lost" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-sm" data-testid="tab-lost">Lost Items</TabsTrigger>
              <TabsTrigger value="claimed" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold text-sm" data-testid="tab-claimed">Claimed Items</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="found">
            {loadingFound ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching the box...</p>
              </div>
            ) : availableFoundItems.length === 0 ? (
              <EmptyState title="No found items" message="Try adjusting your search terms or check back later." icon={<PackageOpen className="w-8 h-8 text-muted-foreground" />} />
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
              <EmptyState title="No lost reports" message="No reports matching your search were found." icon={<HelpCircle className="w-8 h-8 text-muted-foreground" />} />
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

function EmptyState({ title, message, icon }: { title: string, message: string, icon: React.ReactNode }) {
  return (
    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-border">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{message}</p>
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
