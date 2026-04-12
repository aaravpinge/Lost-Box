import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass border-white/40 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-2xl text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
              <AlertCircle className="h-10 w-10 text-rose-500" />
            </div>

            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">404</h1>
            <h2 className="text-xl font-bold text-slate-800 mb-4 tracking-tight">Location Lost</h2>

            <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              The page you're looking for seems to have vanished from the system.
            </p>

            <Link href="/">
              <Button className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Home className="w-4 h-4 mr-3" />
                Head Back Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Background Blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
    </div>
  );
}
