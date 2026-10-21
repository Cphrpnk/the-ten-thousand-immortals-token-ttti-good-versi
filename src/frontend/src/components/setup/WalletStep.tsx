import {
  ExternalLink,
  Link2,
  Plug,
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { usePlug } from "../../hooks/usePlug";
import { ChoiceTile } from "./ChoiceTile";
import { StepQuestion } from "./StepParts";

export type WalletKind = "builtIn" | "plug";
export type WalletScreen = "pickNo" | "pickYes" | "createList";

interface WalletStepProps {
  screen: WalletScreen;
  onShowList: () => void;
  onConnected: (kind: WalletKind) => void;
}

const OTHER_WALLETS = [
  { id: "oisy", name: "OISY", href: "https://oisy.com" },
  { id: "nfid", name: "NFID Wallet", href: "https://nfid.one" },
] as const;

const TITLES: Record<WalletScreen, string> = {
  pickNo: "Choose your wallet",
  pickYes: "Connect your wallet",
  createList: "Create a wallet",
};

/** Step 2: pick or connect a wallet. Sign-in happens right here. */
export function WalletStep({
  screen,
  onShowList,
  onConnected,
}: WalletStepProps) {
  const { identity, login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const plug = usePlug();
  const [pending, setPending] = useState<WalletKind | null>(null);
  const [failed, setFailed] = useState<WalletKind | null>(null);
  const [failMessage, setFailMessage] = useState("");
  const [plugOpened, setPlugOpened] = useState(false);
  const errorAtStart = useRef<Error | undefined>(undefined);
  const sawLoggingIn = useRef(false);
  const attemptedBuiltIn = useRef(false);
  const connectedBuiltIn = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const builtInReady = !!identity && !identity.getPrincipal().isAnonymous();

  const clearBuiltInTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Connect once after a builtIn attempt, whatever state login is in.
  const finishBuiltIn = useCallback(() => {
    if (connectedBuiltIn.current) return;
    connectedBuiltIn.current = true;
    clearBuiltInTimeout();
    setPending(null);
    setFailed(null);
    onConnected("builtIn");
  }, [clearBuiltInTimeout, onConnected]);

  useEffect(() => clearBuiltInTimeout, [clearBuiltInTimeout]);

  // Resolve the Internet Identity popup started by chooseBuiltIn.
  useEffect(() => {
    if (builtInReady && attemptedBuiltIn.current) {
      finishBuiltIn();
      return;
    }
    if (pending !== "builtIn") return;
    if (isLoggingIn) {
      sawLoggingIn.current = true;
      return;
    }
    const newError = isLoginError && loginError !== errorAtStart.current;
    if (newError || sawLoggingIn.current) {
      clearBuiltInTimeout();
      setPending(null);
      setFailed("builtIn");
      setFailMessage("Sign-in didn't finish.");
    }
  }, [
    pending,
    builtInReady,
    isLoggingIn,
    isLoginError,
    loginError,
    finishBuiltIn,
    clearBuiltInTimeout,
  ]);

  // Identity may land after pending/failure already settled on a pick screen.
  useEffect(() => {
    if (screen !== "pickNo" && screen !== "pickYes") return;
    if (builtInReady && attemptedBuiltIn.current) finishBuiltIn();
  }, [screen, builtInReady, finishBuiltIn]);

  const chooseBuiltIn = useCallback(() => {
    setFailed(null);
    if (builtInReady) {
      attemptedBuiltIn.current = true;
      connectedBuiltIn.current = true;
      clearBuiltInTimeout();
      setPending(null);
      onConnected("builtIn");
      return;
    }
    attemptedBuiltIn.current = true;
    connectedBuiltIn.current = false;
    errorAtStart.current = loginError;
    sawLoggingIn.current = false;
    setPending("builtIn");
    clearBuiltInTimeout();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setPending((current) => (current === "builtIn" ? null : current));
      setFailed("builtIn");
      setFailMessage("Sign-in didn't finish.");
    }, 60_000);
    if (!isLoggingIn) login();
  }, [
    builtInReady,
    onConnected,
    loginError,
    login,
    isLoggingIn,
    clearBuiltInTimeout,
  ]);

  const connectPlug = useCallback(async () => {
    setFailed(null);
    if (plug.principal) {
      onConnected("plug");
      return;
    }
    setPending("plug");
    try {
      await plug.connect();
      setPending(null);
      onConnected("plug");
    } catch {
      setPending(null);
      setFailed("plug");
      setFailMessage(
        plug.isAvailable ? "Couldn't connect." : "Plug isn't installed here.",
      );
    }
  }, [plug, onConnected]);

  const retry = () => {
    if (failed === "builtIn") chooseBuiltIn();
    else void connectPlug();
  };

  const busy = pending !== null;
  const builtInTile = (
    <ChoiceTile
      label="Use the built-in wallet"
      icon={<Wallet />}
      tone="primary"
      badge="Recommended"
      onClick={chooseBuiltIn}
      loading={pending === "builtIn"}
      disabled={busy}
      ocid="setup.wallet.builtin_button"
    />
  );
  const connectPlugTile = (label: string, ocid: string) => (
    <ChoiceTile
      label={label}
      icon={<Link2 />}
      tone="plug"
      onClick={() => void connectPlug()}
      loading={pending === "plug"}
      disabled={busy}
      ocid={ocid}
    />
  );

  return (
    <>
      <StepQuestion>{TITLES[screen]}</StepQuestion>
      <div className="flex w-full flex-col gap-3">
        {screen === "pickNo" ? (
          <>
            {builtInTile}
            <ChoiceTile
              label="Create a wallet"
              icon={<Plus />}
              onClick={onShowList}
              disabled={busy}
              ocid="setup.wallet.create_button"
            />
          </>
        ) : null}
        {screen === "pickYes" ? (
          <>
            {connectPlugTile(
              "Connect my wallet",
              "setup.wallet.connect_button",
            )}
            {builtInTile}
          </>
        ) : null}
        {screen === "createList" ? (
          <>
            <ChoiceTile
              label="Plug"
              icon={<Plug />}
              tone="plug"
              href="https://plugwallet.ooo"
              onClick={() => setPlugOpened(true)}
              trailing={<ExternalLink />}
              ocid="setup.wallet.plug_link"
            />
            {plugOpened || plug.isAvailable
              ? connectPlugTile(
                  "Connect Plug",
                  "setup.wallet.plug_connect_button",
                )
              : null}
            <p className="pt-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Other wallets
            </p>
            {OTHER_WALLETS.map((wallet, index) => (
              <ChoiceTile
                key={wallet.id}
                label={wallet.name}
                icon={<Wallet />}
                tone="quiet"
                href={wallet.href}
                trailing={<ExternalLink />}
                ocid={`setup.wallet.other_link.${index + 1}`}
              />
            ))}
          </>
        ) : null}
      </div>
      {failed ? (
        <div
          className="flex items-center justify-center gap-3 text-sm text-destructive"
          role="alert"
          data-ocid="setup.wallet.error_state"
        >
          <span>{failMessage}</span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="setup.wallet.retry_button"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}
    </>
  );
}
