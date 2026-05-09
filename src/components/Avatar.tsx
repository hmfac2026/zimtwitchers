import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

function initialFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // First letter of each whitespace-separated word, up to 2.
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-forest font-medium text-bone",
        SIZES[size],
        className,
      )}
    >
      {initialFor(name)}
    </span>
  );
}
