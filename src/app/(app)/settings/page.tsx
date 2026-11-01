"use client";

import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { LogoField } from "@/components/ui/logo-field";
import { PageHeader } from "@/components/ui/page-header";
import { useSession } from "@/lib/auth/use-session";
import { useCompany } from "@/lib/local-prefs";

export default function SettingsPage() {
  const [company, update] = useCompany();
  const { user } = useSession();

  return (
    <>
      <PageHeader title="Settings" description="Your organisation and account." />

      <div className="flex max-w-2xl flex-col gap-6">
        {/* After the "Company details" reference: logo, then name and email side by side. */}
        <Card className="p-5">
          <h2 className="text-[15px] font-medium tracking-[-0.006em]">Company details</h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Shown on the payment records you export. Saved on this device for now.
          </p>
          <div className="mt-6 flex flex-col gap-6">
            <LogoField value={company.logo} onChange={(logo) => update({ logo })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" htmlFor="company-name">
                <Input
                  id="company-name"
                  value={company.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Acme DAO"
                  autoComplete="organization"
                />
              </Field>
              <Field label="Email" htmlFor="company-email">
                <Input
                  id="company-email"
                  type="email"
                  value={company.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="payroll@acme.xyz"
                  autoComplete="email"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-medium tracking-[-0.006em]">Account</h2>
          <dl className="mt-4 flex flex-col gap-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-fg-subtle">Signed in as</dt>
              <dd className="font-medium">{user?.email ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
