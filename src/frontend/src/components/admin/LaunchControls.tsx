import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { useGetSaleStatus, useSetSalesPaused } from "../../hooks/useQueries";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";

interface SwitchRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  pending: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => void;
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  pending,
  onLabel,
  offLabel,
  onChange,
}: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gold bg-background/50 p-4 transition-smooth hover:border-gold-strong">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id} className="font-semibold">
            {label}
          </Label>
          <Badge
            variant={checked ? "destructive" : "secondary"}
            data-ocid={`${id}.status`}
          >
            {checked ? onLabel : offLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {pending && (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Switch
          id={id}
          checked={checked}
          disabled={pending}
          onCheckedChange={onChange}
          data-ocid={`${id}.switch`}
        />
      </div>
    </div>
  );
}

function notify(promise: Promise<void>, success: string) {
  promise
    .then(() => toast.success(success))
    .catch((error: Error) =>
      toast.error(error.message || "The switch could not be updated."),
    );
}

/** 'Stop sales' switch, read from getSaleStatus. */
export function LaunchControls() {
  const { data: status, isLoading } = useGetSaleStatus();
  const setSalesPaused = useSetSalesPaused();

  return (
    <Card
      className="rounded-lg border-gold bg-card shadow-subtle"
      data-ocid="admin.launch_controls_card"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Power className="w-5 h-5 text-primary" />
          Sales
        </CardTitle>
        <CardDescription>
          Pauses or resumes new purchases. Changes apply immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !status ? (
          <div className="space-y-3" data-ocid="admin.launch_loading_state">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <SwitchRow
              id="admin-sales-paused"
              label="Stop sales"
              description="Pause every new purchase. Existing balances and transfers are unaffected."
              checked={status.salesPaused}
              pending={setSalesPaused.isPending}
              onLabel="Sales stopped"
              offLabel="Sales open"
              onChange={(value) =>
                notify(
                  setSalesPaused.mutateAsync(value),
                  value ? "Sales stopped" : "Sales resumed",
                )
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
