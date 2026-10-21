/** Public Onramper buy page (the funnel's only ICP provider). */
export const ONRAMPER_BUY_URL = "https://onramper.com/buy";

function copyWithTextarea(text: string): boolean {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

/**
 * Copy text to the clipboard. The Clipboard API call starts synchronously, so
 * call this directly inside a click handler; falls back to a hidden textarea.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithTextarea(text);
    }
  }
  return copyWithTextarea(text);
}

/**
 * One click: start copying the address, then open Onramper in a new tab.
 * Both happen synchronously in the caller's click handler so neither the
 * clipboard write nor the popup is blocked. Resolves to whether the copy
 * succeeded.
 */
export function copyAddressAndOpenOnramper(address: string): Promise<boolean> {
  const copied = copyToClipboard(address);
  window.open(ONRAMPER_BUY_URL, "_blank", "noopener,noreferrer");
  return copied;
}
