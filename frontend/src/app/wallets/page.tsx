"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Account } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useSSE } from "@/hooks/use-sse";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { AccountCreateForm } from "@/components/account-create-form";
import { TransferForm } from "@/components/transfer-form";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { Plus, Wallet } from "lucide-react";

function WalletsContent() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { lastEvent, clearLastEvent } = useSSE(token);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAccounts();
  }, [token, fetchAccounts]);

  useEffect(() => {
    if (lastEvent) {
      fetchAccounts();
      clearLastEvent();
    }
  }, [lastEvent, fetchAccounts, clearLastEvent]);

  const handleTransfer = (account: Account) => {
    setSelectedAccount(account);
    setShowTransferForm(true);
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
                  Wallets
                </h1>
                <p className="text-stone text-sm mt-0.5">
                  View your account balances at a glance
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAccountForm(true)}>
                <Plus size={14} />
                Create Wallet
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-stone py-8 text-center">
                Loading wallets...
              </div>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-stone">
                    No wallets yet. Create an account to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-pearl flex items-center justify-center">
                            <Wallet size={18} className="text-gold-600" />
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
                        <Badge variant="success">{account.type}</Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] text-stone uppercase tracking-wide">
                            Balance
                          </p>
                          <p className="text-xl font-bold text-obsidian">
                            $
                            {account.balance.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone">
                          <span>{account.currency}</span>
                          <span>
                            {new Date(
                              account.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTransfer(account)}
                          >
                            Transfer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showAccountForm && (
        <AccountCreateForm
          onSuccess={fetchAccounts}
          onClose={() => setShowAccountForm(false)}
        />
      )}

      {showTransferForm && selectedAccount && (
        <TransferForm
          accounts={accounts}
          onSuccess={fetchAccounts}
          onClose={() => {
            setShowTransferForm(false);
            setSelectedAccount(null);
          }}
        />
      )}
    </div>
  );
}

export default function WalletsPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <WalletsContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
