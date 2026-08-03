"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Account, Transaction } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useSSE } from "@/hooks/use-sse";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { TransferForm } from "@/components/transfer-form";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import {
  Users,
  ArrowRightLeft,
  Wallet,
  DollarSign,
  Plus,
  Download,
  MoreHorizontal,
  Wifi,
  WifiOff,
} from "lucide-react";

function DashboardContent() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const { connected, lastEvent, clearLastEvent } = useSSE(token);

  const fetchData = useCallback(async () => {
    try {
      const accountsData = await api.getAccounts();
      setAccounts(accountsData);

      if (accountsData.length > 0) {
        const txns = await api.getTransactions(accountsData[0].id, 5);
        setRecentTransactions(txns);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token, fetchData]);

  // Refetch when SSE event arrives
  useEffect(() => {
    if (lastEvent) {
      fetchData();
      clearLastEvent();
    }
  }, [lastEvent, fetchData, clearLastEvent]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const stats = [
    {
      title: "Accounts",
      value: String(accounts.length),
      icon: Users,
      iconColor: "text-gold-500",
    },
    {
      title: "Transactions",
      value: String(recentTransactions.length),
      icon: ArrowRightLeft,
      iconColor: "text-gold-600",
    },
    {
      title: "Wallets",
      value: String(accounts.length),
      icon: Wallet,
      iconColor: "text-gold-700",
    },
    {
      title: "Total Balance",
      value: `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      iconColor: "text-success",
    },
  ];

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
                  Dashboard
                </h1>
                <p className="text-stone text-sm mt-0.5">
                  Overview of your banking operations.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-stone">
                  {connected ? (
                    <>
                      <Wifi size={12} className="text-success" />
                      Live
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} className="text-danger" />
                      Offline
                    </>
                  )}
                </div>
                <Button variant="secondary" size="sm">
                  <Download size={14} />
                  Export
                </Button>
                <Button size="sm" onClick={() => setShowTransferForm(true)}>
                  <Plus size={14} />
                  Transfer
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-stone py-8 text-center">
                Loading dashboard data...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-obsidian">
                        Recent Transactions
                      </h2>
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentTransactions.length === 0 ? (
                      <div className="px-6 py-8 text-sm text-stone text-center">
                        No transactions yet. Create an account and make a
                        transfer to get started.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-pearl/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                              Transaction
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
                            <th className="px-6 py-3 text-right text-[11px] font-semibold text-stone uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-silver">
                          {recentTransactions.map((txn) => (
                            <tr
                              key={txn.id}
                              className="hover:bg-pearl/50 transition-colors"
                            >
                              <td className="px-6 py-3.5">
                                <span className="text-sm font-medium text-gold-600">
                                  {txn.id.slice(0, 8)}...
                                </span>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="text-sm">
                                  <span className="text-obsidian">
                                    {txn.debitAccount?.name || "Account"}
                                  </span>
                                  <span className="text-stone mx-1.5">
                                    &rarr;
                                  </span>
                                  <span className="text-obsidian">
                                    {txn.creditAccount?.name || "Account"}
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
                                  {new Date(txn.createdAt).toLocaleDateString()}
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
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>

      {showTransferForm && (
        <TransferForm
          accounts={accounts}
          onSuccess={fetchData}
          onClose={() => setShowTransferForm(false)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <DashboardContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
