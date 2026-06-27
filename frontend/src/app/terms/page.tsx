import { LegalPage, LegalSection } from "@/components/legal-page";

const CONTACT = "contact@michelesottocasa.it";

export const metadata = {
  title: "Terms of Service · UnderFinance",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="27 June 2026">
      <p className="text-sm">
        UnderFinance is a self-hosted personal-finance application provided for the
        operator&apos;s own personal and household use. By using it you agree to
        these terms.
      </p>

      <LegalSection heading="Purpose">
        <p>
          The application lets a single individual record, import and analyze their
          own finances — tracking expenses, income, budgets and savings goals, and
          optionally importing transactions from their own bank accounts via Open
          Banking. It is not a financial advisor and does not provide regulated
          financial, investment or tax advice.
        </p>
      </LegalSection>

      <LegalSection heading="Personal use only">
        <p>
          This is a private, single-user instance. It is not offered as a service
          to the public and is not intended for use by anyone other than the
          operator.
        </p>
      </LegalSection>

      <LegalSection heading="Bank connections">
        <p>
          Bank account information is retrieved through Enable Banking, a licensed
          AISP, and only for accounts you explicitly authorize. You are responsible
          for keeping your bank consents current and for the accuracy of any data
          you manually enter. Imported data may be incomplete or delayed depending
          on your bank, and categorization suggestions are best-effort.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p>
          The application is provided &quot;as is&quot;, without warranties of any
          kind. The operator makes no guarantee that the figures, insights or
          imported data are accurate or complete, and is not liable for any
          decisions made based on them. Always verify important figures against
          your official bank statements.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
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
