"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_NOTIFICATION_STATE,
  markNotificationRead,
  markNotificationsRead,
  patchNotificationPrefs,
  persistNotificationState,
  readStoredNotificationState,
  type MockNotificationPrefs,
  type MockNotificationState,
} from "@/lib/account/mock-notifications";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: MockNotificationState = EMPTY_NOTIFICATION_STATE;

function sameState(
  a: MockNotificationState,
  b: MockNotificationState,
): boolean {
  if (a === b) {
    return true;
  }
  if (
    a.prefs.emailOrders !== b.prefs.emailOrders ||
    a.prefs.emailSupport !== b.prefs.emailSupport ||
    a.prefs.smsOrders !== b.prefs.smsOrders ||
    a.readIds.length !== b.readIds.length
  ) {
    return false;
  }
  return a.readIds.every((id, index) => id === b.readIds[index]);
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): MockNotificationState {
  const next = readStoredNotificationState();
  if (sameState(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): MockNotificationState {
  return EMPTY_NOTIFICATION_STATE;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(next: MockNotificationState) {
  persistNotificationState(next);
  cached = next;
  emit();
}

export function useMockNotifications() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPref = useCallback(
    (key: keyof MockNotificationPrefs, value: boolean) => {
      write(
        patchNotificationPrefs(readStoredNotificationState(), { [key]: value }),
      );
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    write(markNotificationRead(readStoredNotificationState(), id));
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    write(markNotificationsRead(readStoredNotificationState(), ids));
  }, []);

  return {
    prefs: state.prefs,
    readIds: state.readIds,
    setPref,
    markRead,
    markAllRead,
  };
}
