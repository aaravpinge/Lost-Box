import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { buildUrl } from "@shared/routes";

export default function AuthPage() {
    const [, setLocation] = useLocation();
    const { user, isLoading: userLoading } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in and admin, redirect to admin dashboard
    if (!userLoading && user?.isAdmin === "true") {
        setLocation("/admin");
        return null;
    }

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email");
        const password = formData.get("password");

        try {
            const url = buildUrl("/api/login");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const loggedInUser = await res.json();
                if (loggedInUser.isAdmin === "true") {
                    setLocation("/admin");
                } else {
                    setLocation("/");
                }
            } else {
                const data = await res.json();
                toast({
                    title: "Login Failed",
                    description: data.message || "Invalid credentials",
                    variant: "destructive",
                });
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl mx-auto mb-6 flex items-center justify-center border-4 border-white/20 hover:scale-110 transition-transform duration-500">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                            <Archive className="w-7 h-7" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-white text-glow tracking-tighter mb-2">Staff Portal</h1>
                    <p className="text-white/60 font-medium">Lost Box Management System</p>
                </div>

                <Card className="glass border-white/40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden backdrop-blur-2xl">
                    <CardHeader className="pt-8 text-center pb-2">
                        <CardTitle className="text-xl font-bold text-slate-900">Sign In</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Access for authorized personnel only</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="login-email" className="text-xs font-black uppercase tracking-widest text-slate-400">School Email</Label>
                                <Input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="admin@bwscampus.com"
                                    className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-primary/20 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="login-password" className="text-xs font-black uppercase tracking-widest text-slate-400">Password</Label>
                                </div>
                                <Input
                                    id="login-password"
                                    name="password"
                                    type="password"
                                    required
                                    className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-primary/20 font-medium"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : "Authenticate"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 px-8 py-4 border-t border-white/20">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-full">
                            Strict monitoring in effect
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
