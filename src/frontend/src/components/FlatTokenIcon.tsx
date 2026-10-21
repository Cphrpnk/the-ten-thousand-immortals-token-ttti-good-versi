import { cn } from "@/lib/utils";

export function FlatTokenIcon({
  className,
  alt,
  loading,
}: {
  className?: string;
  alt?: string;
  loading?: "lazy" | "eager";
}) {
  const altText = alt ?? "TTTI token";
  const decorative = altText === "";
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full",
        className,
      )}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src="/assets/generated/ttti-token-flat.jpeg"
        width={512}
        height={512}
        alt={altText}
        loading={loading}
        decoding="async"
        className="h-full w-full scale-[1.12] object-cover"
      />
    </span>
  );
}
