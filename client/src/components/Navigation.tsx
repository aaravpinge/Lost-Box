import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { PackageSearch, Search, PlusCircle, LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { logout } = useAuth(); // Assuming this exists or using simple redirect

  const isActive = (path: string) => location === path;

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <PackageSearch className="w-6 h-6 text-primary" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-foreground">
                Lost Box
              </span>
            </Link>

            <div className="hidden md:flex ml-10 space-x-1">
              <Link href="/">
                <a className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                  isActive("/") 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  Found Items
                </a>
              </Link>
              <Link href="/report/lost">
                <a className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                  isActive("/report/lost") 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  Report Lost Items
                </a>
              </Link>
              <Link href="/report/found">
                <a className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                  isActive("/report/found") 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  Report Found Items
                </a>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/admin">
                  <Button 
                    variant={isActive("/admin") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Dashboard</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <a href="/api/login">
                  <LogIn className="w-4 h-4" />
                  Editor Login
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t px-4 py-2 flex justify-around bg-white">
        <Link href="/">
          <a className={cn("flex flex-col items-center p-2 rounded-md", isActive("/") ? "text-primary" : "text-muted-foreground")}>
            <Search className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Found</span>
          </a>
        </Link>
        <Link href="/report/lost">
          <a className={cn("flex flex-col items-center p-2 rounded-md", isActive("/report/lost") ? "text-primary" : "text-muted-foreground")}>
            <PackageSearch className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Lost</span>
          </a>
        </Link>
        <Link href="/report/found">
          <a className={cn("flex flex-col items-center p-2 rounded-md", isActive("/report/found") ? "text-primary" : "text-muted-foreground")}>
            <PlusCircle className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Report</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
