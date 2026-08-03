"use client";

import { useState, FormEvent } from "react";
import { api, Account } from "@/lib/api";
import { Button } from "@/components/button";
import { X } from "lucide-react";

interface AccountCreateFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function AccountCreateForm({ onSuccess, onClose }: AccountCreateFormProps) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS">("CHECKING");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.createAccount({
        name,
        type: accountType,
        currency,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-silver w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-obsidian">
            New Account
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-pearl text-stone"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-light text-danger text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Primary Checking"
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Account Type
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as "CHECKING" | "SAVINGS")}
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="INR">INR - Indian Rupee</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
