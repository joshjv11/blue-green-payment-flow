import { Link } from 'react-router-dom';
import { DollarSign, Menu, User, LogOut, LayoutDashboard, FileText, BarChart3, Settings, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/lib/useEntitlements';
import { ProBadge } from '@/components/ProBadge';
import { cn } from '@/lib/utils';

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const { plan, loading } = useEntitlements();
  const isPro = !loading && (plan === 'pro' || plan === 'premium');

  return (
    <header className={cn(
      "border-b shadow-sm sticky top-0 z-50 transition-all duration-300",
      isPro 
        ? "bg-card/90 glass-pro border-[hsl(45,100%,60%)]/20 shadow-pro-glow backdrop-blur-xl" 
        : "bg-card glass border-border/50"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <DollarSign className={cn(
                "h-6 w-6 sm:h-8 sm:w-8 transition-colors duration-300",
                isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
              )} />
              <span className={cn(
                "text-lg sm:text-xl font-bold transition-colors duration-300",
                isPro ? "pro-gradient-text" : "text-foreground"
              )}>
                <span className="hidden sm:inline">InvoiceFlow</span>
                <span className="sm:hidden">IF</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-2">
                <Avatar className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-300",
                  isPro && "ring-2 ring-[hsl(45,100%,60%)]/30 shadow-pro-glow"
                )}>
                  <AvatarFallback className={cn(
                    "text-xs sm:text-sm font-semibold transition-colors duration-300",
                    isPro 
                      ? "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] text-[hsl(230,35%,7%)]"
                      : "bg-primary text-primary-foreground"
                  )}>
                    {user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-xs sm:text-sm max-w-32 truncate transition-colors duration-300",
                      isPro ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {user.email}
                    </span>
                    {isPro && <ProBadge variant="icon-only" />}
                  </div>
                </div>
              </div>
            )}
            
            {/* Mobile Auth Buttons - Show only when not authenticated */}
            {!user && (
              <div className="flex md:hidden items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">
                    <LogIn className="h-4 w-4 mr-1" />
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            )}
            
            {/* Mobile Menu - Show only when authenticated */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mr-2">
                  <div className="px-2 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                      {isPro && <ProBadge variant="icon-only" />}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/bills" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Bills
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/analytics" className="flex items-center">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden lg:flex h-8 w-8 p-0">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Account menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <span>My Account</span>
                      {isPro && <ProBadge variant="icon-only" />}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;