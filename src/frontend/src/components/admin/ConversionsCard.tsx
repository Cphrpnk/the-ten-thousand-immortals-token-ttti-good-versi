import type { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  History,
  Undo2,
} from "lucide-react";
import type { Conversion } from "../../backend";
import { ConversionStatus } from "../../backend";
import { useConversions } from "../../hooks/useQueries";
import {
  TTTI_SYMBOL,
  encodeAccountText,
  formatIcp,
  formatTtti,
  formatUsdE8,
  truncateAccountText,
} from "../../lib/token";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

/** Format a nanosecond bigint timestamp as a locale string. */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Historical conversion rows keep their recorded message unchanged. */
function safeConversionMessage(message: string | undefined): string {
  return message ?? "";
}

function truncatePrincipal(principal: Principal): string {
  const text = principal.toText();
  if (text.length <= 18) return text;
  return `${text.slice(0, 9)}…${text.slice(-6)}`;
}

const STATUS_STYLES: Record<
  ConversionStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  [ConversionStatus.completed]: {
    label: "Completed",
    className: "border-success/30 bg-success/10 text-success",
    icon: CheckCircle2,
  },
  [ConversionStatus.refunded]: {
    label: "Refunded",
    className: "border-warning/40 bg-warning/10 text-warning",
    icon: Undo2,
  },
  [ConversionStatus.refundFailed]: {
    label: "Refund failed",
    className:
      "border-destructive/50 bg-destructive/20 text-destructive font-semibold",
    icon: AlertCircle,
  },
  [ConversionStatus.failed]: {
    label: "Failed",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: AlertCircle,
  },
};

function ConversionStatusBadge({ status }: { status: ConversionStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES[ConversionStatus.failed];
  const Icon = style.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${style.className}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {style.label}
    </Badge>
  );
}

function ConversionList({ conversions }: { conversions: Conversion[] }) {
  const sorted = [...conversions].sort((a, b) =>
    a.id < b.id ? 1 : a.id > b.id ? -1 : 0,
  );

  return (
    <>
      <div className="hidden md:block">
        <Table data-ocid="admin.conversions_table">
          <TableHeader className="sticky top-0 bg-secondary [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground">
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Depositor</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="text-right">ICP</TableHead>
              <TableHead className="text-right">{TTTI_SYMBOL}</TableHead>
              <TableHead className="text-right">Price used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((conversion, index) => (
              <TableRow
                key={conversion.id.toString()}
                className="transition-smooth hover:bg-primary/5"
                data-ocid={`admin.conversion_row.${index + 1}`}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{conversion.id.toString()}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {truncatePrincipal(conversion.depositor)}
                </TableCell>
                <TableCell
                  className="font-mono text-xs"
                  title={encodeAccountText(conversion.recipient)}
                >
                  {truncateAccountText(
                    encodeAccountText(conversion.recipient),
                    9,
                    6,
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatIcp(conversion.icpAmount)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums text-primary">
                  {formatTtti(conversion.tttiAmount)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums whitespace-nowrap">
                  {formatUsdE8(conversion.priceUsdE8)}
                </TableCell>
                <TableCell>
                  <ConversionStatusBadge status={conversion.status} />
                </TableCell>
                <TableCell
                  className="max-w-56 truncate text-xs text-muted-foreground"
                  title={safeConversionMessage(conversion.message)}
                >
                  {safeConversionMessage(conversion.message) || "—"}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(conversion.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div
        className="space-y-3 p-4 md:hidden"
        data-ocid="admin.conversions_list"
      >
        {sorted.map((conversion, index) => (
          <div
            key={conversion.id.toString()}
            className="space-y-3 border-t border-border py-5"
            data-ocid={`admin.conversion_item.${index + 1}`}
          >
            <div className="flex items-center justify-between gap-3">
              <ConversionStatusBadge status={conversion.status} />
              <span className="font-mono text-xs text-muted-foreground">
                #{conversion.id.toString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {TTTI_SYMBOL} credited
              </span>
              <span className="font-mono font-semibold tabular-nums text-primary">
                {formatTtti(conversion.tttiAmount)}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">ICP</dt>
              <dd className="font-mono text-right tabular-nums">
                {formatIcp(conversion.icpAmount)}
              </dd>
              <dt className="text-muted-foreground">Price used</dt>
              <dd className="font-mono text-right tabular-nums">
                {formatUsdE8(conversion.priceUsdE8)}
              </dd>
              <dt className="text-muted-foreground">Depositor</dt>
              <dd className="font-mono text-right break-all">
                {conversion.depositor.toText()}
              </dd>
              <dt className="text-muted-foreground">Recipient</dt>
              <dd className="font-mono text-right break-all">
                {conversion.recipient.owner.toText()}
              </dd>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="text-right">
                {formatTimestamp(conversion.timestamp)}
              </dd>
            </dl>
            {conversion.message && (
              <p className="text-xs text-muted-foreground break-words">
                {safeConversionMessage(conversion.message)}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** Read-only list of every purchase, most recent first. */
export function ConversionsCard({ className }: { className: string }) {
  const { data: conversions, isLoading } = useConversions();

  return (
    <Card className={className} data-ocid="admin.conversions_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <History className="w-5 h-5 text-primary" />
          ICP → {TTTI_SYMBOL} Conversions
        </CardTitle>
        <CardDescription>
          Every purchase with its status and the ICP/USD price used, most recent
          first. Read-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div
            className="space-y-3 p-6"
            data-ocid="admin.conversions_loading_state"
          >
            {Array.from(
              { length: 3 },
              (_, i) => `conversion-skeleton-${i}`,
            ).map((id) => (
              <Skeleton key={id} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !conversions || conversions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
            data-ocid="admin.conversions_empty_state"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-secondary text-primary">
              <Banknote className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold">
                No conversions yet
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                ICP purchases converted into {TTTI_SYMBOL} are listed here.
              </p>
            </div>
          </div>
        ) : (
          <ConversionList conversions={conversions} />
        )}
      </CardContent>
    </Card>
  );
}
