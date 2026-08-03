"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Wallet,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-40 h-screen bg-obsidian border-r border-charcoal/30 flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-charcoal/30">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-sm font-semibold text-cream tracking-tight">
              BankingWallet
            </span>
          </div>
        )}
        {collapsed && <Logo size="sm" className="mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            "p-1.5 rounded-md hover:bg-charcoal/50 text-stone hover:text-cream transition-colors",
            collapsed && "hidden"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm",
                isActive
                  ? "bg-gold-500/15 text-gold-400"
                  : "text-stone hover:text-cream hover:bg-charcoal/40"
              )}
            >
              <item.icon
                size={18}
                className={clsx(
                  "shrink-0",
                  isActive ? "text-gold-400" : "text-stone group-hover:text-cream"
                )}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-charcoal/30">
        {!collapsed && (
          <p className="text-[11px] text-charcoal text-center">v1.0.0</p>
        )}
      </div>
    </aside>
  );
}
