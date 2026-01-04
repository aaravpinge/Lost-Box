import { useState } from "react";
import { useItems } from "@/hooks/use-items";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackageOpen, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [search, setSearch] = useState("");
  const { data: foundItems, isLoading: loadingFound } = useItems("found", search);
  const { data: lostItems, isLoading: loadingLost } = useItems("lost", search);

  const isLoading = loadingFound || loadingLost;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <section className="relative bg-white border-b overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
              Lost something? <br />
              <span className="text-primary">Let's help you find it.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The Lost Box system helps connect lost items with their owners. 
              Search through the database below or report a new lost/found item.
            </p>
            
            <div className="relative max-w-xl mx-auto transform transition-all hover:scale-105 duration-300">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-primary/50" />
              </div>
              <Input
                type="text"
                placeholder="Search items (e.g., 'Hydro Flask', 'Calculator')..."
                className="pl-12 h-14 text-lg rounded-2xl border-2 border-primary/10 shadow-lg shadow-primary/5 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="found" className="w-full">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <h2 className="text-2xl font-display font-bold text-foreground">Community Items</h2>
            <TabsList className="bg-white border">
              <TabsTrigger value="found" className="px-6">Found Items</TabsTrigger>
              <TabsTrigger value="lost" className="px-6">Lost Reports</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="found">
            {loadingFound ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching the box...</p>
              </div>
            ) : foundItems?.length === 0 ? (
              <EmptyState title="No found items" message="Try adjusting your search terms or check back later." icon={<PackageOpen className="w-8 h-8 text-muted-foreground" />} />
            ) : (
              <ItemGrid items={foundItems || []} />
            )}
          </TabsContent>

          <TabsContent value="lost">
            {loadingLost ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching reports...</p>
              </div>
            ) : lostItems?.length === 0 ? (
              <EmptyState title="No lost reports" message="No reports matching your search were found." icon={<HelpCircle className="w-8 h-8 text-muted-foreground" />} />
            ) : (
              <ItemGrid items={lostItems || []} />
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
