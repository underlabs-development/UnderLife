import { LegalPage, LegalSection } from "@/components/legal-page";

const CONTACT = "contact@michelesottocasa.it";

export const metadata = {
  title: "Privacy Policy · UnderFinance",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="27 June 2026">
      <p className="text-sm">
        UnderFinance is a self-hosted personal-finance application operated by an
        individual for their own personal and household use. This policy explains
        what data the application handles and how it is protected.
      </p>

      <LegalSection heading="Who runs this app">
        <p>
          This is a single-user, self-hosted instance. The operator is both the
          controller and the only user of the data. It is not a public service and
          does not have other users or customers.
        </p>
      </LegalSection>

      <LegalSection heading="What data we process">
        <p>
          Account profile data (email, name) used to sign in, and personal finance
          data you enter or import: transactions (amount, date, description),
          categories, budgets and savings goals. If you connect a bank, we process
          the transactions returned by that account.
        </p>
      </LegalSection>

      <LegalSection heading="Bank connections (Open Banking / PSD2)">
        <p>
          Bank connectivity is provided through Enable Banking, a licensed Account
          Information Service Provider (AISP). Strong Customer Authentication always
          happens on your bank&apos;s own page — this application never sees or
          stores your banking credentials. We store only an encrypted access token
          that lets us read your transactions, and only for the account(s) you
          explicitly link. Bank consent expires periodically (typically every
          90–180 days) and must be renewed by you.
        </p>
      </LegalSection>

      <LegalSection heading="How data is stored and secured">
        <p>
          All data is stored on the operator&apos;s own server (a PostgreSQL
          database). Aggregator access tokens are encrypted at rest. Automatic
          transaction categorization runs on a local AI model on the same server,
          so transaction text is not sent to any third-party AI service by default.
        </p>
      </LegalSection>

      <LegalSection heading="Sharing">
        <p>
          Your data is not sold, rented or shared with third parties. The only
          external processor involved is the Open Banking aggregator (Enable
          Banking), strictly to retrieve the transactions of the accounts you link.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          As this is your own self-hosted data, you retain full control: you can
          view, edit, export or delete any record, disconnect a bank at any time,
          and delete the entire dataset by removing it from your server. For
          questions, contact{" "}
          <a
            href={`mailto:${CONTACT}`}
            className="text-[var(--neon-primary)] no-underline hover:underline"
          >
            {CONTACT}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
