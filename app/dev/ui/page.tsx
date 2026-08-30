import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { CatalogSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { InteractiveDemo } from "./interactive-demo";
import { CURRENCY_SYMBOL } from "@/lib/format/currency";

export const metadata: Metadata = {
  title: "UI primitives — Techno House",
  robots: { index: false, follow: false },
};

export default function UiPrimitivesPage() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-10 px-4 py-8">
      <header>
        <p className="text-caption font-medium text-primary">Foundation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          UI primitives
        </h1>
        <p className="mt-2 text-text-muted">
          Internal kit for Phase 01. Not a storefront page.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="flex max-w-md flex-col gap-4">
        <h2 className="text-lg font-semibold">Form controls</h2>
        <Field
          label="Email"
          htmlFor="demo-email"
          hint="We will not share this."
        >
          <Input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Category" htmlFor="demo-category">
          <Select id="demo-category" name="category" defaultValue="laptops">
            <option value="laptops">Laptops</option>
            <option value="components">Components</option>
          </Select>
        </Field>
        <Field label="Notes" htmlFor="demo-notes">
          <Textarea id="demo-notes" name="notes" rows={3} />
        </Field>
        <Checkbox label="Exclude out of stock" name="in-stock" />
        <RadioGroup legend="Sort">
          <Radio name="sort" value="featured" label="Featured" defaultChecked />
          <Radio name="sort" value="price" label="Price" />
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Badges and alerts</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="sale">Sale</Badge>
          <Badge tone="new">New</Badge>
          <Badge tone="stock">In stock</Badge>
          <Badge tone="warranty">2 year warranty</Badge>
        </div>
        <p className="font-medium tabular-nums">{CURRENCY_SYMBOL} 12,500</p>
        <Alert tone="info" title="Info">
          Neutral status message.
        </Alert>
        <Alert tone="warning" title="Low stock">
          Only a few units remain.
        </Alert>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Card, table, navigation</h2>
        <Card>
          <CardHeader>
            <CardTitle>Sample card</CardTitle>
            <CardDescription>Surface with a light shadow.</CardDescription>
          </CardHeader>
          <p className="text-body">
            Use for grouped content, not product chrome.
          </p>
        </Card>
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/dev/ui", label: "Primitives" },
            { label: "Current" },
          ]}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Product</TableHeader>
              <TableHeader>Stock</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Example CPU</TableCell>
              <TableCell>In stock</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Pagination page={1} pageCount={3} hrefForPage={() => "/dev/ui"} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tabs, dialog, sheet</h2>
        <InteractiveDemo />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Loading, empty, error</h2>
        <CatalogSkeleton count={4} />
        <EmptyState
          title="No products found"
          description="Try another category or clear your filters."
        />
        <ErrorState />
      </section>
    </main>
  );
}
