import { Principal } from "@icp-sdk/core/principal";
import {
  ArrowDownToLine,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { usePlug } from "../../hooks/usePlug";
import { useWalletBalance } from "../../hooks/useWallet";
import { ICP_LEDGER_CANISTER_ID } from "../../lib/icpLedger";
import { copyAddressAndOpenOnramper } from "../../lib/onramper";
import { encodeAccountText } from "../../lib/token";
import { ChoiceTile } from "./ChoiceTile";
import {
  AddressChip,
  GOLD_BUTTON_CLASS,
  QUIET_BUTTON_CLASS,
  StepQuestion,
  WaitingForIcp,
} from "./StepParts";
import type { WalletKind } from "./WalletStep";

export type IcpScreen = "hasIcp" | "sendIcp" | "buyIcp";

interface IcpStepProps {
  screen: IcpScreen;
  wallet: WalletKind | null;
  onAnswer: (next: "sendIcp" | "buyIcp") => void;
  /** Finish the setup as completed (ICP arrived or Continue). */
  onComplete: () => void;
  finishing: boolean;
}

const ICP_LEDGER = Principal.fromText(ICP_LEDGER_CANISTER_ID);
const POLL_MS = 4000;

type BuyState = "idle" | "copied" | "copyFailed";

/** Step 3: ICP in the wallet? Polls the balance and finishes when it lands. */
export function IcpStep({
  screen,
  wallet,
  onAnswer,
  onComplete,
  finishing,
}: IcpStepProps) {
  const { identity } = useInternetIdentity();
  const { principal: plugPrincipal } = usePlug();
  const owner =
    wallet === "plug"
      ? plugPrincipal
      : identity && !identity.getPrincipal().isAnonymous()
        ? identity.getPrincipal()
        : null;
  const address = owner ? encodeAccountText({ owner }) : "";
  const balanceQuery = useWalletBalance(
    ICP_LEDGER,
    owner ? { owner } : undefined,
  );
  const { refetch } = balanceQuery;
  const hasOwner = !!owner;
  const balance = balanceQuery.data;
  const hasIcp = balance !== undefined && balance > 0n;
  const [buyState, setBuyState] = useState<BuyState>("idle");
  const finished = useRef(false);

  useEffect(() => {
    if (!hasOwner) return;
    const id = window.setInterval(() => {
      void refetch();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [hasOwner, refetch]);

  useEffect(() => {
    if (!hasIcp || finished.current) return;
    finished.current = true;
    onComplete();
  }, [hasIcp, onComplete]);

  const handleBuy = () => {
    void copyAddressAndOpenOnramper(address).then((ok) =>
      setBuyState(ok ? "copied" : "copyFailed"),
    );
  };

  const continueButton = (
    <button
      type="button"
      onClick={onComplete}
      disabled={finishing}
      className={screen === "sendIcp" ? GOLD_BUTTON_CLASS : QUIET_BUTTON_CLASS}
      data-ocid="setup.icp.continue_button"
    >
      {finishing ? <Loader2 className="size-4 animate-spin" /> : null}
      Continue
    </button>
  );

  if (screen === "hasIcp") {
    if ((balanceQuery.isLoading && hasOwner) || hasIcp) {
      return (
        <>
          <StepQuestion>Do you have ICP?</StepQuestion>
          <div
            className="flex min-h-[11.5rem] items-center justify-center"
            data-ocid="setup.icp.check_loading_state"
          >
            <Loader2
              className="size-6 animate-spin text-primary"
              aria-label="Checking your wallet"
            />
          </div>
        </>
      );
    }
    return (
      <>
        <StepQuestion>Do you have ICP?</StepQuestion>
        <div className="flex w-full flex-col gap-3">
          <ChoiceTile
            label="Yes"
            icon={<ArrowDownToLine />}
            onClick={() => onAnswer("sendIcp")}
            ocid="setup.icp.yes_button"
          />
          <ChoiceTile
            label="No"
            icon={<CreditCard />}
            onClick={() => onAnswer("buyIcp")}
            ocid="setup.icp.no_button"
          />
        </div>
      </>
    );
  }

  if (screen === "sendIcp") {
    return (
      <>
        <StepQuestion>Send ICP here</StepQuestion>
        <AddressChip address={address} ocid="setup.icp.address_chip" />
        <p className="text-center text-muted-foreground">
          Send ICP to this address from your other wallet.
        </p>
        <WaitingForIcp />
        {continueButton}
      </>
    );
  }

  return (
    <>
      <StepQuestion>Buy ICP</StepQuestion>
      <button
        type="button"
        onClick={handleBuy}
        disabled={!address}
        className={GOLD_BUTTON_CLASS}
        data-ocid="setup.icp.buy_button"
      >
        Buy ICP here
        <ExternalLink aria-hidden="true" />
      </button>
      <div
        className="flex min-h-6 flex-col items-center gap-3"
        aria-live="polite"
      >
        {buyState === "copied" ? (
          <p
            className="animate-copied-pop text-center text-success motion-reduce:animate-none"
            data-ocid="setup.icp.copied_success_state"
          >
            Address copied — pick ICP and paste it in Onramper
          </p>
        ) : null}
        {buyState === "copyFailed" ? (
          <>
            <p className="text-center text-muted-foreground">
              Copy your address, then paste it in Onramper
            </p>
            <AddressChip address={address} ocid="setup.icp.address_chip" />
          </>
        ) : null}
      </div>
      {buyState !== "idle" ? <WaitingForIcp /> : null}
      {continueButton}
    </>
  );
}
