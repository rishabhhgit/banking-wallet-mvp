import { clsx } from "clsx";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div
      className={clsx(
        "rounded-lg bg-gold-500 flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-1/2 h-1/2 text-obsidian"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    </div>
  );
}
