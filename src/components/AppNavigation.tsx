import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BarChart3, Settings } from 'lucide-react';

const AppNavigation = () => {
  return (
    <>
      {/* Desktop Navigation - Hidden on mobile */}
      <nav className="hidden lg:flex items-center space-x-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/bills"
          className={({ isActive }) =>
            `flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          <FileText className="h-4 w-4" />
          <span>Bills</span>
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`
          }
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex items-center justify-around h-14 px-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors rounded-md min-w-0 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <span className="truncate">Home</span>
          </NavLink>
          <NavLink
            to="/bills"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors rounded-md min-w-0 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary'
              }`
            }
          >
            <FileText className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <span className="truncate">Bills</span>
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors rounded-md min-w-0 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary'
              }`
            }
          >
            <BarChart3 className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <span className="truncate">Stats</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1.5 text-xs font-medium transition-colors rounded-md min-w-0 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary'
              }`
            }
          >
            <Settings className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <span className="truncate">Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Mobile padding to prevent content from being hidden behind bottom nav */}
      <div className="h-14 lg:hidden" />
    </>
  );
};

export default AppNavigation;