import {
  MOCK_ADMIN_ATTRIBUTES,
  type AdminAttribute,
  type AdminAttributeSeed,
} from "@/lib/admin/attributes-mock";
import {
  ADMIN_ATTRIBUTE_PAGE_SIZE,
  type AdminAttributeListParams,
} from "@/lib/admin/attribute-list-params";
import {
  listAdminAttributeRecords,
  usesCatalogDatabase,
} from "@/lib/catalog/admin-attributes";

export type AdminAttributeListResult = {
  items: AdminAttribute[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  params: AdminAttributeListParams;
};

function withMockMeta(attributes: AdminAttributeSeed[]): AdminAttribute[] {
  return attributes.map((attribute, index) => ({
    ...attribute,
    isFilterable: true,
    position: index,
  }));
}

async function loadAttributeRows(): Promise<AdminAttribute[]> {
  if (usesCatalogDatabase()) {
    return listAdminAttributeRecords();
  }
  return withMockMeta(MOCK_ADMIN_ATTRIBUTES);
}

export async function loadAdminAttributeList(
  params: AdminAttributeListParams,
): Promise<AdminAttributeListResult> {
  let items = await loadAttributeRows();

  if (params.q) {
    const needle = params.q.toLowerCase();
    items = items.filter(
      (attr) =>
        attr.name.toLowerCase().includes(needle) ||
        attr.key.toLowerCase().includes(needle) ||
        attr.values.some((value) => value.toLowerCase().includes(needle)),
    );
  }

  items = [...items].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.name.localeCompare(b.name);
  });

  const total = items.length;
  const pageSize = ADMIN_ATTRIBUTE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pageCount,
    params: { ...params, page },
  };
}
