import { MOCK_PRODUCT_QUESTIONS } from "@/lib/admin/questions-mock";
import type { AdminProductQuestion } from "@/lib/admin/questions-mock";
import {
  getAdminQuestionRecord,
  listAdminQuestionRecords,
  usesCatalogDatabase,
} from "@/lib/catalog/admin-questions";

export async function loadAdminQuestionList(): Promise<AdminProductQuestion[]> {
  if (usesCatalogDatabase()) {
    return listAdminQuestionRecords();
  }
  return MOCK_PRODUCT_QUESTIONS;
}

export async function loadAdminQuestionById(
  id: string,
): Promise<AdminProductQuestion | null> {
  if (usesCatalogDatabase()) {
    return getAdminQuestionRecord(id);
  }
  return MOCK_PRODUCT_QUESTIONS.find((item) => item.id === id) ?? null;
}
