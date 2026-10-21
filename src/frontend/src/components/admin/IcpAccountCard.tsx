import { Principal } from "@icp-sdk/core/principal";
import { AlertCircle, CheckCircle2, Loader2, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Account } from "../../backend";
import {
  useSetTreasuryConfig,
  useTreasuryConfig,
} from "../../hooks/useQueries";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GOLD_CARD, PRIMARY_GOLD } from "./styles";

function toHex(bytes: Uint8Array | undefined): string {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The account that receives the creator's ICP from purchases. */
export function IcpAccountCard() {
  const { data: config, isLoading } = useTreasuryConfig();
  const setConfig = useSetTreasuryConfig();

  const [owner, setOwner] = useState("");
  const [subaccount, setSubaccount] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // One-time initialization of the draft from the loaded config.
  if (!initialized && !isLoading && config) {
    setOwner(config.icpAccount.owner.toText());
    setSubaccount(toHex(config.icpAccount.subaccount));
    setInitialized(true);
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let principal: Principal;
    try {
      principal = Principal.fromText(owner.trim());
    } catch {
      setError("Enter a valid ICP account principal.");
      return;
    }

    const hex = subaccount.trim().replace(/^0x/i, "");
    let bytes: Uint8Array | undefined;
    if (hex.length > 0) {
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        setError(
          "The subaccount must be 64 hex characters (32 bytes) or left empty.",
        );
        return;
      }
      bytes = new Uint8Array(
        hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
      );
    }

    const account: Account = bytes
      ? { owner: principal, subaccount: bytes }
      : { owner: principal };

    setConfig.mutate(
      { icpAccount: account },
      {
        onSuccess: () => {
          setSuccess("ICP receiving account saved.");
          toast.success("ICP receiving account saved");
        },
        onError: (err) => {
          setError(err.message || "Failed to save the account.");
          toast.error(err.message || "Failed to save the account.");
        },
      },
    );
  };

  return (
    <Card className={GOLD_CARD} data-ocid="admin.treasury_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Settings2 className="w-5 h-5 text-primary" />
          ICP Receiving Account
        </CardTitle>
        <CardDescription>
          The address that receives the creator's ICP from each purchase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="treasury-owner">ICP Account Principal</Label>
              <Input
                id="treasury-owner"
                type="text"
                placeholder="aaaaa-aa"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                data-ocid="admin.treasury_owner_input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treasury-subaccount">
                Subaccount (optional, 64 hex)
              </Label>
              <Input
                id="treasury-subaccount"
                type="text"
                placeholder="Leave empty for the default subaccount"
                value={subaccount}
                onChange={(e) => setSubaccount(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                data-ocid="admin.treasury_subaccount_input"
              />
            </div>
          </div>

          {error && (
            <Alert
              variant="destructive"
              data-ocid="admin.treasury_config_error_state"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert
              className="border-primary/40 bg-primary/5"
              data-ocid="admin.treasury_config_success_state"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className={`w-full sm:w-auto ${PRIMARY_GOLD}`}
            disabled={setConfig.isPending}
            data-ocid="admin.treasury_save_button"
          >
            {setConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings2 className="w-4 h-4" />
                Save Account
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
