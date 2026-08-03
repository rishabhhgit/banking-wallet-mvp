import { clsx } from "clsx";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-pearl text-charcoal": variant === "default",
          "bg-success-light text-success": variant === "success",
          "bg-gold-100 text-gold-700": variant === "warning",
          "bg-danger-light text-danger": variant === "danger",
        }
      )}
    >
      {children}
    </span>
  );
}
