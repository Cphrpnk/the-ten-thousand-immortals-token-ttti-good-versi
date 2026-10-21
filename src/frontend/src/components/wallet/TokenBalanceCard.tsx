import type { Principal } from "@icp-sdk/core/principal";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { Account } from "../../backend";
import { useWalletBalance } from "../../hooks/useWallet";
import {
  TOKEN_NAME,
  TTTI_DECIMALS,
  TTTI_SYMBOL,
  formatUnits,
} from "../../lib/token";
import type { TokenDescriptor } from "../../lib/tokenRegistry";
import { FlatTokenIcon } from "../FlatTokenIcon";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export { formatUnits };

/** True for this app's own presale token (any TTTI symbol variant). */
export function isTttiToken(token: TokenDescriptor): boolean {
  return token.symbol.toUpperCase().startsWith("TTTI");
}

/** Present TTTI-P with its canonical name, symbol and 8 decimals. */
export function normalizeToken(token: TokenDescriptor): TokenDescriptor {
  if (!isTttiToken(token)) return token;
  return {
    ...token,
    name: TOKEN_NAME,
    symbol: TTTI_SYMBOL,
    decimals: TTTI_DECIMALS,
  };
}

interface TokenBalanceCardProps {
  token: TokenDescriptor;
  account: Account | undefined;
  index: number;
}

export function TokenBalanceCard({
  token: rawToken,
  account,
  index,
}: TokenBalanceCardProps) {
  const token = normalizeToken(rawToken);
  const { data, isError, failureCount, refetch, isFetching } = useWalletBalance(
    token.canisterId,
    account,
  );

  // Leave the placeholder as soon as one attempt fails, even while the
  // query keeps retrying in the background.
  const unavailable = isError || (data === undefined && failureCount > 0);

  return (
    <Card
      className="rounded-lg border-gold bg-gradient-surface shadow-subtle transition-smooth hover:border-gold-strong hover:shadow-gold animate-fade-in"
      data-ocid={`wallet.item.${index}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="inline-flex items-center gap-1.5 rounded-full border-gold font-mono text-xs text-primary"
            data-ocid={`wallet.symbol.${index}`}
          >
            {isTttiToken(token) && <FlatTokenIcon className="h-4 w-4" alt="" />}
            {token.symbol}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground transition-smooth hover:bg-primary/10 hover:text-primary"
            onClick={() => void refetch()}
            disabled={isFetching || !account}
            aria-label={`Refresh ${token.symbol} balance`}
            data-ocid={`wallet.refresh_button.${index}`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <CardTitle className="text-sm font-display font-medium text-foreground">
          {token.name}
        </CardTitle>
        <CardDescription className="font-mono text-xs truncate">
          {token.canisterId.toText()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!account ? (
          <p className="text-sm text-muted-foreground">
            Connect a wallet to view this balance.
          </p>
        ) : unavailable ? (
          <div
            className="flex flex-col items-start gap-2"
            data-ocid={`wallet.error_state.${index}`}
          >
            <p
              className="flex items-center gap-2 text-sm text-destructive"
              aria-live="polite"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Balance unavailable. The ledger did not respond.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-gold transition-smooth hover:border-gold-strong hover:bg-primary/10 hover:text-foreground"
              onClick={() => void refetch()}
              disabled={isFetching}
              data-ocid={`wallet.retry_button.${index}`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </div>
        ) : data === undefined ? (
          <Skeleton
            className="h-8 w-32"
            data-ocid={`wallet.loading_state.${index}`}
          />
        ) : (
          <p
            className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold tabular-nums break-all text-foreground"
            data-ocid={`wallet.balance.${index}`}
          >
            {formatUnits(data, token.decimals)}
            <span className="text-base font-normal text-primary">
              {token.symbol}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface TokenOption {
  canisterId: Principal;
  symbol: string;
  name: string;
  decimals: number;
  fee: bigint;
}
