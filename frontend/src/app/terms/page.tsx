import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Banking Wallet MVP",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-obsidian mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-stone mb-8">
          Last updated: August 3, 2026
        </p>

        <div className="space-y-6 text-sm text-charcoal leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using BankingWallet, you agree to be bound by these
              Terms &amp; Conditions. If you do not agree, do not use the
              platform. These terms apply to all users, including administrators
              and end users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              2. Account Registration
            </h2>
            <p className="mb-3">
              To use our services, you must create an account and provide
              accurate, current, and complete information. You are responsible
              for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              3. Transactions
            </h2>
            <p className="mb-3">
              All transactions are subject to the following terms:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Transactions are processed using idempotency keys to prevent
                duplicate processing
              </li>
              <li>
                We use serializable isolation to ensure transaction integrity
              </li>
              <li>
                Daily transfer limits may apply based on your account tier
              </li>
              <li>
                You may not transfer to your own account
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              4. Fees
            </h2>
            <p>
              BankingWallet currently does not charge fees for standard account
              operations. We reserve the right to introduce fees with 30 days
              written notice. Any applicable fees will be clearly disclosed
              before you authorize a transaction.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              5. Prohibited Activities
            </h2>
            <p className="mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the platform for money laundering or terrorist financing</li>
              <li>Attempt to circumvent security measures or rate limits</li>
              <li>Use automated scripts or bots to interact with the API</li>
              <li>Interfere with or disrupt the platform's infrastructure</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              6. Limitation of Liability
            </h2>
            <p>
              BankingWallet is provided as an MVP (Minimum Viable Product) for
              development and testing purposes. We are not liable for any
              financial losses, data loss, or damages arising from the use of
              this platform. Users should not rely on this platform for
              production financial operations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              7. Termination
            </h2>
            <p>
              We may suspend or terminate your account at any time for violation
              of these terms, suspicious activity, or at our sole discretion.
              Upon termination, your right to use the platform ceases immediately.
              Account balances may be subject to regulatory hold periods.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              8. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Material changes will
              be communicated via email or in-app notification at least 14 days
              before they take effect. Continued use of the platform after
              changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              9. Contact
            </h2>
            <p>
              For questions about these Terms, contact{" "}
              <a
                href="mailto:legal@bankingwallet.example.com"
                className="text-gold-600 hover:text-gold-700 underline"
              >
                legal@bankingwallet.example.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
