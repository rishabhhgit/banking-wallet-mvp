"use client";

import { useEffect, useState } from "react";
import { api, AuditEvent } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardHeader, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Key,
  Eye,
} from "lucide-react";

function SecurityContent() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchEvents = async () => {
      try {
        const data = await api.getAuditEvents();
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch audit events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [token]);

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("FAILED") || eventType.includes("INSUFFICIENT"))
      return { icon: AlertTriangle, color: "text-danger" };
    if (eventType.includes("COMPLETED") || eventType.includes("REGISTERED"))
      return { icon: CheckCircle, color: "text-success" };
    if (eventType.includes("TRANSFER")) return { icon: Key, color: "text-gold-500" };
    return { icon: Eye, color: "text-stone" };
  };

  const getSeverity = (eventType: string) => {
    if (eventType.includes("FAILED") || eventType.includes("INSUFFICIENT"))
      return "danger" as const;
    if (eventType.includes("INITIATED")) return "warning" as const;
    return "default" as const;
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
                  Security
                </h1>
                <p className="text-stone text-sm mt-0.5">
                  Monitor security events and audit trail
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <Shield size={14} />
                Security Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-pearl text-success">
                      <CheckCircle size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-stone uppercase tracking-wide">
                        Total Events
                      </p>
                      <p className="text-xl font-bold text-obsidian">
                        {events.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-pearl text-danger">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-stone uppercase tracking-wide">
                        Failed Transfers
                      </p>
                      <p className="text-xl font-bold text-obsidian">
                        {
                          events.filter(
                            (e) =>
                              e.eventType.includes("FAILED") ||
                              e.eventType.includes("INSUFFICIENT")
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-pearl text-gold-500">
                      <Lock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-stone uppercase tracking-wide">
                        Successful Transfers
                      </p>
                      <p className="text-xl font-bold text-obsidian">
                        {
                          events.filter((e) =>
                            e.eventType.includes("COMPLETED")
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-success" />
                  <h2 className="text-sm font-semibold text-obsidian">
                    Security Status
                  </h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success-light">
                    <CheckCircle size={16} className="text-success" />
                    <div>
                      <p className="text-sm font-medium text-obsidian">
                        SSL/TLS
                      </p>
                      <p className="text-[11px] text-success">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success-light">
                    <CheckCircle size={16} className="text-success" />
                    <div>
                      <p className="text-sm font-medium text-obsidian">
                        Rate Limiting
                      </p>
                      <p className="text-[11px] text-success">Enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success-light">
                    <CheckCircle size={16} className="text-success" />
                    <div>
                      <p className="text-sm font-medium text-obsidian">CORS</p>
                      <p className="text-[11px] text-success">Restricted</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-obsidian">
                  Audit Trail
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="px-6 py-8 text-sm text-stone text-center">
                    Loading audit events...
                  </div>
                ) : events.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-stone text-center">
                    No audit events recorded yet.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-pearl/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Event
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-left text-[11px] font-semibold text-stone uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-silver">
                      {events.map((event) => {
                        const { icon: EventIcon, color } = getEventIcon(
                          event.eventType
                        );
                        return (
                          <tr
                            key={event.id}
                            className="hover:bg-pearl/50 transition-colors"
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <EventIcon size={14} className={color} />
                                <span className="text-sm font-medium text-obsidian">
                                  {event.eventType.replace(/_/g, " ").toLowerCase()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-sm text-stone font-mono">
                                {event.userId?.slice(0, 12) || "system"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge variant={getSeverity(event.eventType)}>
                                {event.eventType.includes("FAILED") ||
                                event.eventType.includes("INSUFFICIENT")
                                  ? "high"
                                  : event.eventType.includes("INITIATED")
                                  ? "medium"
                                  : "low"}
                              </Badge>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-sm text-stone">
                                {new Date(event.createdAt).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <SecurityContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
