"use server";

import {
  createCustomerQuestion,
  createCustomerReview,
  deleteCustomerQuestion,
  deleteCustomerReview,
  type CustomerMutationResult,
} from "@/lib/catalog/customer-reviews";
import type { CustomerQuestionInputFields } from "@/lib/catalog/question-input";
import type { CustomerReviewInputFields } from "@/lib/catalog/review-input";
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

async function guardOrigin(): Promise<{ ok: false; formError: string } | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

async function requireCustomer(): Promise<
  | { ok: true; actor: { userId: string; email: string; fullName: string } }
  | { ok: false; formError: string }
> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to continue." };
  }
  return {
    ok: true,
    actor: {
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
    },
  };
}

export async function createCustomerReviewAction(
  fields: CustomerReviewInputFields,
): Promise<CustomerMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  return createCustomerReview({ fields, actor: allowed.actor });
}

export async function createCustomerQuestionAction(
  fields: CustomerQuestionInputFields,
): Promise<CustomerMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  return createCustomerQuestion({ fields, actor: allowed.actor });
}

export async function deleteCustomerReviewAction(
  id: string,
): Promise<CustomerMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  return deleteCustomerReview({ id, userId: allowed.actor.userId });
}

export async function deleteCustomerQuestionAction(
  id: string,
): Promise<CustomerMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  return deleteCustomerQuestion({ id, userId: allowed.actor.userId });
}
