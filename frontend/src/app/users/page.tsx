"use client";

import { useEffect, useState } from "react";
import { api, Account } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { Plus, Search, MoreHorizontal, Mail } from "lucide-react";

function UsersContent() {
  const { user, token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchAccounts = async () => {
      try {
        const data = await api.getAccounts();
        setAccounts(data);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [token]);

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(search.toLowerCase()) ||
      acc.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-obsidian">
                  My Accounts
                </h1>
                <p className="text-stone text-sm mt-0.5">
                  Manage your bank accounts and balances
                </p>
              </div>
              <Button size="sm">
                <Plus size={14} />
                Create Account
              </Button>
            </div>

            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone"
              />
              <input
                type="text"
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40 transition-colors"
              />
            </div>

            {loading ? (
              <div className="text-sm text-stone py-8 text-center">
                Loading accounts...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-stone">
                    {search
                      ? "No accounts match your search."
                      : "No accounts yet. Create your first account to get started."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-pearl/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-silver">
                      {filteredAccounts.map((account) => (
                        <tr
                          key={account.id}
                          className="hover:bg-pearl/50 transition-colors"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gold-500/15 flex items-center justify-center">
                                <span className="text-gold-700 font-medium text-xs">
                                  {account.name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-obsidian">
                                  {account.name}
                                </p>
                                <p className="text-[11px] text-stone font-mono">
                                  {account.id.slice(0, 12)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge variant="default">{account.type}</Badge>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm font-medium text-obsidian">
                              $
                              {account.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm text-stone">
                              {account.currency}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm text-stone">
                              {new Date(
                                account.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <UsersContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
