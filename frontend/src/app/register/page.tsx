"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Logo } from "@/components/logo";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, error, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(email, password, firstName, lastName);
      router.push("/");
    } catch {
      // Error is handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <h1 className="text-xl font-semibold text-obsidian mt-4">
            BankingWallet
          </h1>
          <p className="text-sm text-stone mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-obsidian mb-1"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError();
                }}
                required
                className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-obsidian mb-1"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError();
                }}
                required
                className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-obsidian mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              required
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-obsidian mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              required
              minLength={10}
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40"
              placeholder="Min 10 chars, uppercase, number, special"
            />
            <p className="text-[11px] text-stone mt-1">
              Must include uppercase, lowercase, number, and special character
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gold-500 text-obsidian rounded-lg font-medium text-sm hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-stone text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-gold-600 hover:text-gold-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
