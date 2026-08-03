"use client";

import { useEffect, useState } from "react";
import { api, Transaction, Account } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft } from "lucide-react";

function TransactionsContent() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const accountsData = await api.getAccounts();
        setAccounts(accountsData);

        // Fetch transactions from all accounts
        const allTxns: Transaction[] = [];
        for (const acc of accountsData) {
          const txns = await api.getTransactions(acc.id, 50);
          allTxns.push(...txns);
        }
        // Deduplicate by id and sort by date
        const unique = Array.from(
          new Map(allTxns.map((t) => [t.id, t])).values()
        ).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTransactions(unique);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filtered = transactions.filter(
    (txn) =>
      txn.id.toLowerCase().includes(search.toLowerCase()) ||
      txn.description.toLowerCase().includes(search.toLowerCase())
  );

  const getAccountName = (id?: string) => {
    if (!id) return "Unknown";
    const acc = accounts.find((a) => a.id === id);
    return acc?.name || id.slice(0, 8);
  };

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
                  Transactions
                </h1>
                <p className="text-stone text-sm mt-0.5">
                  View all transaction history
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <Download size={14} />
                Export CSV
              </Button>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone"
                />
                <input
                  type="text"
                  placeholder="Search by ID or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40 transition-colors"
                />
              </div>
              <Button variant="secondary" size="sm">
                <Filter size={14} />
                Filters
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-stone py-8 text-center">
                Loading transactions...
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-stone">
                    {search
                      ? "No transactions match your search."
                      : "No transactions yet. Make a transfer to see history here."}
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
                          Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          From / To
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-silver">
                      {filtered.map((txn) => (
                        <tr
                          key={txn.id}
                          className="hover:bg-pearl/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3.5">
                            <div>
                              <span className="text-sm font-medium text-gold-600">
                                {txn.id.slice(0, 8)}...
                              </span>
                              <p className="text-[11px] text-stone">
                                {txn.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {txn.type === "TRANSFER" ? (
                                <ArrowUpRight
                                  size={14}
                                  className="text-gold-500"
                                />
                              ) : (
                                <ArrowDownLeft
                                  size={14}
                                  className="text-success"
                                />
                              )}
                              <span className="text-sm capitalize text-obsidian">
                                {txn.type.toLowerCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="text-sm">
                              <span className="text-obsidian">
                                {getAccountName(txn.debitAccountId)}
                              </span>
                              <span className="text-stone mx-1.5">&rarr;</span>
                              <span className="text-obsidian">
                                {getAccountName(txn.creditAccountId)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm font-medium text-obsidian">
                              ${Number(txn.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge
                              variant={
                                txn.status === "COMPLETED"
                                  ? "success"
                                  : txn.status === "PENDING"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {txn.status.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm text-stone">
                              {new Date(txn.createdAt).toLocaleString()}
                            </span>
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

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <TransactionsContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
