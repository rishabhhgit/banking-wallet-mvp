import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-gold-500 text-obsidian hover:bg-gold-600 focus:ring-gold-500 shadow-sm":
            variant === "primary",
          "bg-pearl text-obsidian hover:bg-silver focus:ring-silver border border-silver":
            variant === "secondary",
          "text-charcoal hover:text-obsidian hover:bg-pearl focus:ring-silver":
            variant === "ghost",
          "bg-danger text-white hover:bg-danger/90 focus:ring-danger":
            variant === "danger",
        },
        {
          "text-xs px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2": size === "md",
          "text-base px-6 py-2.5": size === "lg",
        },
        className
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
