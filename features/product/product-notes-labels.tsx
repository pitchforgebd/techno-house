import { AdminLabelBadge } from "@/features/admin/labels/admin-label-badge";
import type { ProductNoteItem } from "@/lib/data/types/catalog";

type ProductNotesPanelProps = {
  notes: ProductNoteItem[];
};

export function ProductNotesPanel({ notes }: ProductNotesPanelProps) {
  if (notes.length === 0) {
    return null;
  }

  const byType = new Map<string, ProductNoteItem[]>();
  for (const note of notes) {
    const list = byType.get(note.type) ?? [];
    list.push(note);
    byType.set(note.type, list);
  }

  return (
    <section
      className="rounded-md border border-border bg-surface px-3 py-3 sm:px-4"
      aria-labelledby="product-notes-heading"
    >
      <h2
        id="product-notes-heading"
        className="text-label font-semibold tracking-tight text-text"
      >
        Product notes
      </h2>
      <div className="mt-3 space-y-4">
        {[...byType.entries()].map(([type, items]) => (
          <div key={type}>
            <h3 className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {type}
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-body text-text-muted">
              {items.map((note) => (
                <li key={note.id} className="flex gap-2">
                  <span aria-hidden className="text-primary">
                    •
                  </span>
                  <span>{note.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductLabelsRow({
  labels,
}: {
  labels: {
    id: string;
    text: string;
    backgroundColor: string;
    textTone: "light" | "dark";
  }[];
}) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Product labels">
      {labels.map((label) => (
        <li key={label.id}>
          <AdminLabelBadge
            text={label.text}
            backgroundColor={label.backgroundColor}
            textTone={label.textTone}
          />
        </li>
      ))}
    </ul>
  );
}
