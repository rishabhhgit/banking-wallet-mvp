"use client";

import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardHeader, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { PageErrorBoundary } from "@/components/page-error-boundary";

function SettingsContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-lg font-semibold text-obsidian">Settings</h1>
              <p className="text-stone text-sm mt-0.5">
                Manage your account preferences.
              </p>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-obsidian">
                  Account
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={user ? `${user.firstName} ${user.lastName}` : ""}
                    readOnly
                    className="w-full px-3 py-2 bg-pearl border border-silver rounded-lg text-sm text-obsidian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="w-full px-3 py-2 bg-pearl border border-silver rounded-lg text-sm text-obsidian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-obsidian mb-1">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={user?.id || ""}
                    readOnly
                    className="w-full px-3 py-2 bg-pearl border border-silver rounded-lg text-sm text-stone font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-obsidian">
                  Security
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-pearl">
                  <div>
                    <p className="text-sm font-medium text-obsidian">
                      Sign out
                    </p>
                    <p className="text-[11px] text-stone">
                      End your current session
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={logout}>
                    Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <SettingsContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
