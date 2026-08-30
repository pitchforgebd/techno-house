const ITEMS = [
  {
    id: "emi",
    title: "EMI on eligible orders",
    text: "Plans shown at checkout.",
  },
  {
    id: "support",
    title: "Support 9:00–22:00",
    text: "Help pages and product requests.",
  },
  {
    id: "card",
    title: "SSLCommerz & bKash",
    text: "Online methods at checkout — display-only.",
  },
  {
    id: "cod",
    title: "Cash on delivery",
    text: "Nationwide where the method is offered.",
  },
] as const;

export function HomeServiceBar() {
  return (
    <div className="border-y border-border bg-primary/10">
      <ul className="mx-auto grid max-w-catalog gap-4 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <p className="text-label font-semibold text-text">{item.title}</p>
            <p className="text-caption text-text-muted">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
