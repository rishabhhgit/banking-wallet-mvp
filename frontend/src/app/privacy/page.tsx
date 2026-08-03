import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Banking Wallet MVP",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-obsidian mb-2">Privacy Policy</h1>
        <p className="text-sm text-stone mb-8">
          Last updated: August 3, 2026
        </p>

        <div className="space-y-6 text-sm text-charcoal leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information you provide directly to us, such as when you
              create an account, make a transaction, or contact support. This
              includes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, and phone number</li>
              <li>Financial information necessary to process transactions</li>
              <li>Account credentials and authentication data</li>
              <li>Transaction history and wallet balances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              2. How We Use Your Information
            </h2>
            <p className="mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process transactions and maintain your wallet</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Send transaction confirmations and security alerts</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              3. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including
              encryption in transit (TLS 1.3) and at rest, rate limiting on
              authentication endpoints, and strict access controls. All
              transactions are processed using serializable isolation to prevent
              race conditions. However, no method of electronic transmission or
              storage is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              4. Data Sharing
            </h2>
            <p>
              We do not sell your personal information to third parties. We may
              share your information only when required by law, to process
              transactions through licensed payment processors, or to protect the
              rights and safety of our users and platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              5. Data Retention
            </h2>
            <p>
              We retain your account information for as long as your account is
              active. Transaction records are retained for a minimum of seven
              years to comply with financial regulations. You may request deletion
              of your account by contacting support, subject to regulatory
              retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              6. Your Rights
            </h2>
            <p className="mb-3">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your data</li>
              <li>Request portability of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-obsidian mb-2">
              7. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at{" "}
              <a
                href="mailto:privacy@bankingwallet.example.com"
                className="text-gold-600 hover:text-gold-700 underline"
              >
                privacy@bankingwallet.example.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
