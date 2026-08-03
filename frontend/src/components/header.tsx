"use client";

import { Bell, Search, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 bg-cream/80 backdrop-blur-sm border-b border-silver sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone"
            />
            <input
              type="text"
              placeholder="Search users, transactions..."
              className="w-full pl-9 pr-4 py-2 bg-pearl border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-md hover:bg-pearl text-charcoal hover:text-obsidian transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

          <div className="h-6 w-px bg-silver" />

          <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-pearl transition-colors">
            <div className="w-7 h-7 rounded-full bg-gold-500/20 flex items-center justify-center">
              <User size={14} className="text-gold-600" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-obsidian leading-tight">Admin</p>
              <p className="text-[11px] text-stone">Super Admin</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
