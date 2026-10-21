import { ArrowLeft, Check, Minus } from "lucide-react";
import { useCallback, useState } from "react";
import { useBuyFunnel } from "../../hooks/useBuyFunnel";
import { SetupOutcome } from "../../hooks/useSetupStatus";
import { cn } from "../../lib/utils";
import { CrestLogo } from "../Footer";
import { ChoiceTile } from "../setup/ChoiceTile";
import { type IcpScreen, IcpStep } from "../setup/IcpStep";
import { StepIndicator, StepQuestion } from "../setup/StepParts";
import {
  type WalletKind,
  type WalletScreen,
  WalletStep,
} from "../setup/WalletStep";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";

export interface SetupFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Screen = "hasWallet" | WalletScreen | IcpScreen;

const STEP_OF: Record<Screen, number> = {
  hasWallet: 1,
  pickNo: 2,
  pickYes: 2,
  createList: 2,
  hasIcp: 3,
  sendIcp: 3,
  buyIcp: 3,
};

/**
 * Guided wallet setup (wallet? → pick/connect → ICP?). The provider in
 * useBuyFunnel remounts it on every openSetup(), so it starts at step 1.
 */
export function SetupFlow({ open, onOpenChange }: SetupFlowProps) {
  const { finishSetup, isFinishingSetup } = useBuyFunnel();
  const [history, setHistory] = useState<Screen[]>(["hasWallet"]);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [wallet, setWallet] = useState<WalletKind | null>(null);
  const screen = history[history.length - 1];
  const step = STEP_OF[screen];
  const canGoBack = history.length > 1;

  const go = useCallback((next: Screen) => {
    setDirection("forward");
    setHistory((current) => [...current, next]);
  }, []);

  const goBack = () => {
    setDirection("back");
    setHistory((current) =>
      current.length > 1 ? current.slice(0, -1) : current,
    );
  };

  const handleConnected = useCallback(
    (kind: WalletKind) => {
      setWallet(kind);
      go("hasIcp");
    },
    [go],
  );

  const complete = useCallback(() => {
    void finishSetup(SetupOutcome.completed);
  }, [finishSetup]);

  const skip = () => {
    void finishSetup(SetupOutcome.skipped);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] overflow-y-auto border-gold bg-popover p-6 shadow-elevated sm:max-w-lg md:p-10"
        data-ocid="setup_flow.dialog"
      >
        <DialogDescription className="sr-only">
          Three quick steps before your first purchase.
        </DialogDescription>
        <div className="flex flex-col items-center gap-7">
          <CrestLogo className="h-11 w-11" />
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              aria-label="Back"
              className={cn(
                "-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !canGoBack && "invisible",
              )}
              data-ocid="setup_flow.back_button"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <StepIndicator step={step} />
          </div>

          <div
            key={screen}
            className={cn(
              "flex w-full flex-col gap-6 motion-reduce:animate-none",
              direction === "forward" ? "animate-step-in" : "animate-step-back",
            )}
            data-ocid={`setup_flow.${screen}.section`}
          >
            {screen === "hasWallet" ? (
              <>
                <StepQuestion>Do you have an ICP wallet?</StepQuestion>
                <div className="flex w-full flex-col gap-3">
                  <ChoiceTile
                    label="Yes"
                    icon={<Check />}
                    onClick={() => go("pickYes")}
                    ocid="setup.has_wallet.yes_button"
                  />
                  <ChoiceTile
                    label="No"
                    icon={<Minus />}
                    onClick={() => go("pickNo")}
                    ocid="setup.has_wallet.no_button"
                  />
                </div>
              </>
            ) : null}
            {screen === "pickNo" ||
            screen === "pickYes" ||
            screen === "createList" ? (
              <WalletStep
                screen={screen}
                onShowList={() => go("createList")}
                onConnected={handleConnected}
              />
            ) : null}
            {screen === "hasIcp" ||
            screen === "sendIcp" ||
            screen === "buyIcp" ? (
              <IcpStep
                screen={screen}
                wallet={wallet}
                onAnswer={go}
                onComplete={complete}
                finishing={isFinishingSetup}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={skip}
            disabled={isFinishingSetup}
            className="min-h-11 rounded-lg px-4 text-sm text-muted-foreground underline-offset-4 transition-smooth hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            data-ocid="setup_flow.skip_button"
          >
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
