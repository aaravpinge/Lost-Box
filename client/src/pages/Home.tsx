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
      <section className="relative bg-white border-b overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Lost something? <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Let's help you find it.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              The Lost Box system helps connect lost items with their owners. 
              Search through the database below or report a new lost/found item.
            </p>
            
            <div className="relative max-w-xl mx-auto group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search items (e.g., 'Hydro Flask', 'Calculator')..."
                  className="pl-12 h-14 text-lg rounded-2xl border-none shadow-xl focus:ring-4 focus:ring-blue-500/10 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="found" className="w-full">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4 bg-white p-4 rounded-2xl border shadow-sm">
            <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
              <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
              Dashboard
            </h2>
            <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
              <TabsTrigger value="found" className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all" data-testid="tab-found">Found Items</TabsTrigger>
              <TabsTrigger value="lost" className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all" data-testid="tab-lost">Lost Items</TabsTrigger>
              <TabsTrigger value="claimed" className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all" data-testid="tab-claimed">Claimed Items</TabsTrigger>
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
