"use client";

import { useState, FormEvent } from "react";
import { api, Account } from "@/lib/api";
import { Button } from "@/components/button";
import { X } from "lucide-react";

interface TransferFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onClose: () => void;
}

export function TransferForm({ accounts, onSuccess, onClose }: TransferFormProps) {
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (debitAccountId === creditAccountId) {
      setError("Cannot transfer to the same account");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    setSubmitting(true);
    try {
      await api.createTransaction({
        amount: amountNum,
        description,
        debitAccountId,
        creditAccountId,
        idempotencyKey: crypto.randomUUID(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const debitAccount = accounts.find((a) => a.id === debitAccountId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-silver w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-obsidian">
            Transfer Money
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
              From Account
            </label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value="">Select source account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (${acc.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              To Account
            </label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value="">Select destination account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40"
              />
            </div>
            {debitAccount && (
              <p className="text-[11px] text-stone mt-1">
                Available: ${debitAccount.balance.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={500}
              placeholder="Payment for..."
              className="w-full px-3 py-2 bg-white border border-silver rounded-lg text-sm text-obsidian placeholder:text-stone focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            />
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
              {submitting ? "Processing..." : "Send Money"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
