import { useCallback, useState } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

/** Guided wallet setup status (kept in this browser, per principal). */
export const SetupStatus = {
  notStarted: "notStarted",
  completed: "completed",
  skipped: "skipped",
} as const;
export type SetupStatus = (typeof SetupStatus)[keyof typeof SetupStatus];

/** Outcome recorded when the setup flow ends. */
export const SetupOutcome = {
  completed: "completed",
  skipped: "skipped",
} as const;
export type SetupOutcome = (typeof SetupOutcome)[keyof typeof SetupOutcome];

const SEEN_VALUE = "seen";
const storageKey = (principalText: string) => `ttti.setupFlow.${principalText}`;

function readFlag(principalText: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(principalText));
  } catch {
    return null;
  }
}

function writeFlag(principalText: string, value: string): void {
  try {
    window.localStorage.setItem(storageKey(principalText), value);
  } catch {
    // Storage unavailable (private mode): the flow may open again.
  }
}

export interface SetupStatusState {
  /** Text of the signed-in principal, or null when signed out. */
  principalText: string | null;
  /** Current status; signed-out visitors always read notStarted. */
  status: SetupStatus;
  /** Always false: the flag is read synchronously from this browser. */
  isLoading: boolean;
  /** True once the flow was shown to the signed-in user in this browser. */
  hasSeen: boolean;
  /** Record that the flow was shown (it then no longer opens by itself). */
  markSeen: () => void;
  /** Record completed or skipped for the signed-in user. */
  saveOutcome: (outcome: SetupOutcome) => Promise<void>;
  isSaving: boolean;
}

/** The guided wallet setup status of the signed-in principal. */
export function useSetupStatus(): SetupStatusState {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();
  const principalText =
    principal && !principal.isAnonymous() ? principal.toText() : null;
  // Bumped after each write so the stored flag is read again.
  const [, setRevision] = useState(0);

  const flag = principalText ? readFlag(principalText) : null;
  const status: SetupStatus =
    flag === SetupStatus.completed || flag === SetupStatus.skipped
      ? flag
      : SetupStatus.notStarted;

  const markSeen = useCallback(() => {
    if (!principalText || readFlag(principalText) !== null) return;
    writeFlag(principalText, SEEN_VALUE);
    setRevision((current) => current + 1);
  }, [principalText]);

  const saveOutcome = useCallback(
    async (outcome: SetupOutcome) => {
      if (!principalText) return;
      writeFlag(principalText, outcome);
      setRevision((current) => current + 1);
    },
    [principalText],
  );

  return {
    principalText,
    status,
    isLoading: false,
    hasSeen: flag !== null,
    markSeen,
    saveOutcome,
    isSaving: false,
  };
}
