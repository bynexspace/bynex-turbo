import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 backdrop-blur", className)}>
      <button
        onClick={() => setTheme("neon")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
          theme === "neon"
            ? "bg-grad-brand text-white shadow-glow"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
        )}
        aria-label="Tema Midnight Neon"
      >
        <Moon className="h-3 w-3" /> Neon
      </button>
      <button
        onClick={() => setTheme("cloud")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
          theme === "cloud"
            ? "bg-white text-slate-900 shadow"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
        )}
        aria-label="Tema Cloud White"
      >
        <Sun className="h-3 w-3" /> Cloud
      </button>
    </div>
  );
}
