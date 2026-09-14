"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_CONVERSATIONS,
  appendMockQuestion,
  appendMockReview,
  persistConversations,
  readStoredConversations,
  removeMockQuestion,
  removeMockReview,
  type MockAccountQuestion,
  type MockAccountReview,
  type MockConversationsState,
} from "@/lib/account/mock-conversations";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: MockConversationsState = EMPTY_CONVERSATIONS;

function sameConversations(
  a: MockConversationsState,
  b: MockConversationsState,
): boolean {
  if (a === b) {
    return true;
  }
  if (
    a.reviews.length !== b.reviews.length ||
    a.questions.length !== b.questions.length
  ) {
    return false;
  }
  return (
    a.reviews.every((item, index) => item.id === b.reviews[index]?.id) &&
    a.questions.every((item, index) => item.id === b.questions[index]?.id)
  );
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): MockConversationsState {
  const next = readStoredConversations();
  if (sameConversations(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): MockConversationsState {
  return EMPTY_CONVERSATIONS;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(next: MockConversationsState) {
  persistConversations(next);
  cached = next;
  emit();
}

export function useMockConversations() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addReview = useCallback((review: MockAccountReview) => {
    write(appendMockReview(readStoredConversations(), review));
  }, []);

  const addQuestion = useCallback((question: MockAccountQuestion) => {
    write(appendMockQuestion(readStoredConversations(), question));
  }, []);

  const deleteReview = useCallback((id: string) => {
    write(removeMockReview(readStoredConversations(), id));
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    write(removeMockQuestion(readStoredConversations(), id));
  }, []);

  return {
    reviews: state.reviews,
    questions: state.questions,
    addReview,
    addQuestion,
    deleteReview,
    deleteQuestion,
  };
}
