import { Link, useLocation } from "wouter";
import { PackageSearch, Search, PlusCircle, LayoutDashboard, LogIn, LogOut, MessageSquare, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import schoolLogo from "@assets/school_logo_1767939229083.png";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24 gap-4">
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-3 sm:gap-5 group cursor-pointer">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-lg group-hover:scale-105 transition-transform duration-500 shrink-0">
                <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-black text-2xl sm:text-4xl tracking-tighter text-slate-900 leading-none group-hover:text-primary transition-colors drop-shadow-sm whitespace-nowrap">
                  Lost Box
                </span>
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mt-1 whitespace-nowrap">{"Brentwood School Lost & Found"}</span>
              </div>
            </Link>
          </div>

          <div className="hidden xl:flex items-center justify-center flex-1 mx-4">
            <div className="flex items-center space-x-1 xl:space-x-2">
              {[
                { label: "Dashboard", href: "/" },
                { label: "Report Lost", href: "/report/lost" },
                { label: "Report Found", href: "/report/found" },
              ].map((link) => (
                <Link key={link.href} href={link.href}>
                  <span className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap px-4 xl:px-6 py-3 rounded-2xl text-xs xl:text-sm font-black uppercase tracking-widest transition-all duration-300 cursor-pointer",
                    isActive(link.href)
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                      : "text-slate-500 hover:bg-slate-100/80 hover:text-primary hover:scale-[1.02] active:scale-95"
                  )}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a 
              href="mailto:apinge2027@bwscampus.com?subject=Lost Box App Feedback&body=Device/Browser:%0D%0A%0D%0ABug Description/Error:%0D%0A%0D%0AFeature Request:%0D%0A"
              className="hidden lg:block"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-slate-200 bg-white text-slate-800 font-black text-[10px] uppercase tracking-widest h-10 px-4 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="whitespace-nowrap">Give Feedback</span>
              </Button>
            </a>
            {user ? (
              <div className="flex items-center gap-2">
                {user.isAdmin === "true" && (
                  <Link href="/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-4 whitespace-nowrap",
                        isActive("/admin") ? "bg-secondary text-white shadow-lg shadow-secondary/20" : "text-secondary hover:bg-secondary/5"
                      )}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="hidden xl:inline">Admin Panel</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest h-10 px-4 sm:px-6 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Staff Login</span>
                  <span className="sm:hidden">Login</span>
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl h-10 w-10 p-0 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 shrink-0"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-slate-100 flex justify-around p-2 bg-white/50 backdrop-blur-xl">
        {[
          { icon: LayoutDashboard, label: "Feed", href: "/" },
          { icon: PackageSearch, label: "Lost", href: "/report/lost" },
          { icon: PlusCircle, label: "Found", href: "/report/found" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <span className={cn(
              "flex flex-col items-center p-3 rounded-2xl cursor-pointer transition-all min-w-[70px]",
              isActive(item.href) ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400"
            )}>
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
