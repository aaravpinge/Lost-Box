import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/Home";
import ReportLost from "@/pages/ReportLost";
import ReportFound from "@/pages/ReportFound";
import Admin from "@/pages/Admin";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
import { AnimatePresence, motion } from "framer-motion";

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Disable browser automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    // Scroll to top when route changes or component mounts
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const navEntries = window.performance.getEntriesByType("navigation");
    const isReload = navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "reload";
    
    // Redirect to home if it's a page reload, unless they are on the admin/auth area
    if (isReload && window.location.pathname !== "/admin" && window.location.pathname !== "/auth") {
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Switch>
            <Route path="/" component={() => <PageTransition><Home /></PageTransition>} />
            <Route path="/report/lost" component={() => <PageTransition><ReportLost /></PageTransition>} />
            <Route path="/report/found" component={() => <PageTransition><ReportFound /></PageTransition>} />
            <Route path="/admin" component={() => <PageTransition><Admin /></PageTransition>} />
            <Route path="/auth" component={() => <PageTransition><AuthPage /></PageTransition>} />
            <Route component={() => <PageTransition><NotFound /></PageTransition>} />
          </Switch>
        </AnimatePresence>
      </main>
      <footer className="bg-slate-50 border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
                <span className="font-black text-xs">LB</span>
              </div>
              <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">Lost Box System</span>
            </div>

            <div className="text-center md:text-right">
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Items Unclaimed Over 30 Days are Donated</p>
              <p className="text-[10px] font-medium text-slate-400 italic">© {new Date().getFullYear()} Brentwood. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Router />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
