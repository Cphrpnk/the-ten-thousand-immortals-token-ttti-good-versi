import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { SetupFlow } from "../components/funnel/SetupFlow";
import { hasSeenWhitePaper, markWhitePaperSeen } from "../lib/whitePaperGate";
import { useInternetIdentity } from "./useInternetIdentity";
import { usePlug } from "./usePlug";
import { SetupOutcome, SetupStatus, useSetupStatus } from "./useSetupStatus";

export { SetupOutcome, hasSeenWhitePaper, markWhitePaperSeen };

/** Route of the buy page. */
export const BUY_PATH = "/buy";

export interface BuyFunnelContextValue {
  /**
   * First click in this browser → white paper (flag recorded); then signed
   * out or setup not started → setup flow; otherwise → /buy.
   */
  startBuy: () => void;
  /** Open the setup flow from step 1 (menu "Set up wallet"). */
  openSetup: () => void;
  /** Close the setup flow without recording an outcome. */
  closeSetup: () => void;
  /** Save #completed / #skipped, close the flow and go to /buy. */
  finishSetup: (outcome: SetupOutcome) => Promise<void>;
  /** True when an Internet Identity session or a Plug connection is present. */
  isSignedIn: boolean;
  /** Current setup status of the signed-in user (notStarted when signed out). */
  setupStatus: SetupStatus;
  isSetupOpen: boolean;
  /** True while finishSetup is saving the outcome. */
  isFinishingSetup: boolean;
}

const BuyFunnelContext = createContext<BuyFunnelContextValue | undefined>(
  undefined,
);

/**
 * Shared Buy TTTI-T funnel. Must be rendered inside the router so it can
 * navigate. Renders the guided SetupFlow dialog once for the whole app.
 */
export function BuyFunnelProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { principal: plugPrincipal } = usePlug();
  const {
    principalText,
    status,
    isLoading,
    hasSeen,
    markSeen,
    saveOutcome,
    isSaving,
  } = useSetupStatus();
  const [open, setOpen] = useState(false);
  // Bumped on every fresh open so SetupFlow remounts at step 1.
  const [session, setSession] = useState(0);
  const prompted = useRef<Set<string>>(new Set());

  const isSignedIn = !!identity || !!plugPrincipal;

  const openSetup = useCallback(() => {
    setSession((current) => current + 1);
    setOpen(true);
  }, []);

  const closeSetup = useCallback(() => {
    setOpen(false);
  }, []);

  // First sign-in: show the setup flow once per principal, then record it as
  // seen in this browser so it does not open by itself again (even on reload).
  // If the flow is already open (the sign-in happened inside it), keep its step.
  useEffect(() => {
    if (!principalText || isLoading) return;
    if (prompted.current.has(principalText)) return;
    prompted.current.add(principalText);
    if (hasSeen || status !== SetupStatus.notStarted) return;
    markSeen();
    if (!open) setSession((s) => s + 1);
    setOpen(true);
  }, [principalText, isLoading, hasSeen, status, open, markSeen]);

  const startBuy = useCallback(() => {
    if (!hasSeenWhitePaper()) {
      markWhitePaperSeen();
      void navigate({ to: "/white-paper" });
      return;
    }
    const needsSetup =
      !isSignedIn ||
      (!!principalText && !isLoading && status === SetupStatus.notStarted);
    if (needsSetup) {
      openSetup();
      return;
    }
    void navigate({ to: BUY_PATH });
  }, [isSignedIn, principalText, isLoading, status, openSetup, navigate]);

  const finishSetup = useCallback(
    async (outcome: SetupOutcome) => {
      try {
        await saveOutcome(outcome);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save your setup",
        );
      }
      setOpen(false);
      void navigate({ to: BUY_PATH });
    },
    [saveOutcome, navigate],
  );

  const value = useMemo<BuyFunnelContextValue>(
    () => ({
      startBuy,
      openSetup,
      closeSetup,
      finishSetup,
      isSignedIn,
      setupStatus: status,
      isSetupOpen: open,
      isFinishingSetup: isSaving,
    }),
    [
      startBuy,
      openSetup,
      closeSetup,
      finishSetup,
      isSignedIn,
      status,
      open,
      isSaving,
    ],
  );

  return createElement(
    BuyFunnelContext.Provider,
    { value },
    children,
    createElement(SetupFlow, {
      key: session,
      open,
      onOpenChange: (next: boolean) => {
        if (next) setOpen(true);
        else closeSetup();
      },
    }),
  );
}

export function useBuyFunnel(): BuyFunnelContextValue {
  const context = useContext(BuyFunnelContext);
  if (!context) {
    throw new Error("useBuyFunnel must be used within a BuyFunnelProvider");
  }
  return context;
}
