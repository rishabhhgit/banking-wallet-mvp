const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_VERSION = "v1";

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  private setTokens(token: string, refreshToken: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const requestId = crypto.randomUUID();
    headers["X-Request-Id"] = requestId;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 401 && !isRetry) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(
            `${this.baseUrl}/api/${API_VERSION}/users/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            }
          );

          if (refreshResponse.ok) {
            const { token: newToken, refreshToken: newRefreshToken } =
              await refreshResponse.json();
            this.setTokens(newToken, newRefreshToken);

            return this.request<T>(endpoint, options, true);
          }
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`,
      }));
      throw new ApiError(error.error || "Unknown error", response.status);
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Auth
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.post<{
      user: User;
      token: string;
      refreshToken: string;
    }>(`/api/${API_VERSION}/users/register`, data);

    if (typeof window !== "undefined") {
      this.setTokens(response.token, response.refreshToken);
    }

    return response;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.post<{
      user: User;
      token: string;
      refreshToken: string;
    }>(`/api/${API_VERSION}/users/login`, data);

    if (typeof window !== "undefined") {
      this.setTokens(response.token, response.refreshToken);
    }

    return response;
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }

  // Accounts
  async getAccounts() {
    return this.get<Account[]>(`/api/${API_VERSION}/accounts`);
  }

  async createAccount(data: { name: string; type?: string; currency?: string }) {
    return this.post<Account>(`/api/${API_VERSION}/accounts`, data);
  }

  // Transactions
  async getTransactions(accountId: string, limit = 50, offset = 0) {
    return this.get<Transaction[]>(
      `/api/${API_VERSION}/transactions/account/${accountId}?limit=${limit}&offset=${offset}`
    );
  }

  async createTransaction(data: {
    amount: number;
    description: string;
    debitAccountId: string;
    creditAccountId: string;
    idempotencyKey?: string;
  }) {
    const headers: Record<string, string> = {};
    if (data.idempotencyKey) {
      headers["Idempotency-Key"] = data.idempotencyKey;
    }
    return this.post<Transaction>(`/api/${API_VERSION}/transactions`, data, { headers });
  }

  // SSE
  createEventSource(endpoint: string): EventSource {
    const token = this.getToken();
    const url = `${this.baseUrl}${endpoint}`;
    return new EventSource(url);
  }

  // Health
  async getHealth() {
    return this.get<{
      status: string;
      checks: Record<string, string>;
      uptime: number;
    }>("/health");
  }

  // Audit
  async getAuditEvents() {
    return this.get<AuditEvent[]>(`/api/${API_VERSION}/audit/recent`);
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: string;
  status: string;
  debitAccountId: string;
  creditAccountId: string;
  debitAccount?: { id: string; name: string; userId?: string };
  creditAccount?: { id: string; name: string; userId?: string };
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  userId: string | null;
  metadata: string | null;
  createdAt: string;
}

export const api = new ApiClient(API_URL);
