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

/**
 * Build a breadcrumb trail from the current path.
 *
 * The list is BUILT here, never pushed into the caller's array: the old
 * code did `const breadcrumbs = items || []` and then `push`ed the home
 * crumb onto it, so a caller that passed `[]` found "Dashboard" sitting
 * in its own array afterwards, and a second render pushed a second copy.
 */
function breadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
    const pathnames = pathname.split("/").filter((x) => x);

    // Default home breadcrumb
    const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", path: "/" }];

    pathnames.forEach((name, index) => {
        // Skip IDs or codes in simpler automatic generation for now,
        // specific pages should ideally pass custom items
        if (name === "module" || name === "record") return;

        const path = `/${pathnames.slice(0, index + 1).join("/")}`;
        const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

        crumbs.push({ label, path: index === pathnames.length - 1 ? undefined : path });
    });

    return crumbs;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    const location = useLocation();

    // If no items are provided, try to generate them from the path
    const breadcrumbs: BreadcrumbItem[] =
        items && items.length > 0 ? items : breadcrumbsFromPath(location.pathname);

    return (
        <nav className={cn("flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-3 mb-6", className)}>
            {breadcrumbs.map((item, index) => (
                <div key={item.path ?? item.label} className="flex items-center">
                    {index === 0 ? (
                        <Link
                            to={item.path || "/"}
                            className="flex items-center gap-1.5 hover:text-primary-tint transition-colors group ds-hit-44-h"
                        >
                            <Home className="w-3 h-3 transition-transform group-hover:scale-110" />
                            <span className="mt-0.5">{item.label}</span>
                        </Link>
                    ) : item.path ? (
                        <Link
                            to={item.path}
                            className="inline-flex items-center hover:text-primary-tint transition-colors ds-hit-44-h"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-ink-2">{item.label}</span>
                    )}

                    {index < breadcrumbs.length - 1 && (
                        <ChevronRight className="w-3 h-3 mx-2 text-ink-4" />
                    )}
                </div>
            ))}
        </nav>
    );
}
