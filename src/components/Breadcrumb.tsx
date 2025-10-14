import { ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (items.length > 1 && items[items.length - 2].href) {
      navigate(items[items.length - 2].href!);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="h-8 w-8 p-0 hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <nav className="flex items-center gap-1 overflow-x-auto">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isMiddle = index > 0 && index < items.length - 1 && items.length > 3;

          // On mobile, show only first and last if there are many items
          if (isMiddle) {
            return (
              <span key={index} className="hidden md:flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {item.href ? (
                  <Link
                    to={item.href}
                    className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </span>
            );
          }

          return (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              {isLast ? (
                <span className="font-medium text-foreground whitespace-nowrap">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
