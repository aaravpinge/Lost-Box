import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import ReportLost from "@/pages/ReportLost";
import ReportFound from "@/pages/ReportFound";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/report/lost" component={ReportLost} />
          <Route path="/report/found" component={ReportFound} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="bg-white border-t py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Lost Box System. Items donated after 30 days.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
