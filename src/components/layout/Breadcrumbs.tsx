import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    const location = useLocation();

    // If no items are provided, try to generate them from the path
    const breadcrumbs: BreadcrumbItem[] = items || [];

    if (breadcrumbs.length === 0) {
        const pathnames = location.pathname.split("/").filter((x) => x);

        // Default home breadcrumb
        breadcrumbs.push({ label: "Dashboard", path: "/" });

        pathnames.forEach((name, index) => {
            // Skip IDs or codes in simpler automatic generation for now, 
            // specific pages should ideally pass custom items
            if (name === "module" || name === "record") return;

            const path = `/${pathnames.slice(0, index + 1).join("/")}`;
            const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

            breadcrumbs.push({ label, path: index === pathnames.length - 1 ? undefined : path });
        });
    }

    return (
        <nav className={cn("flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6 animate-fade-in", className)}>
            {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center">
                    {index === 0 ? (
                        <Link
                            to={item.path || "/"}
                            className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                        >
                            <Home className="w-3 h-3 transition-transform group-hover:scale-110" />
                            <span className="mt-0.5">{item.label}</span>
                        </Link>
                    ) : item.path ? (
                        <Link
                            to={item.path}
                            className="hover:text-primary transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-foreground/80">{item.label}</span>
                    )}

                    {index < breadcrumbs.length - 1 && (
                        <ChevronRight className="w-3 h-3 mx-2 text-muted-foreground/30" />
                    )}
                </div>
            ))}
        </nav>
    );
}
