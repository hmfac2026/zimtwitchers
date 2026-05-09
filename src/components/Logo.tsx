import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

type LogoProps = {
  size?: LogoSize;
  iconOnly?: boolean;
  className?: string;
  /** Optional override of the wordmark text (defaults to "Zim Twitchers"). */
  wordmark?: string;
};

const SIZES: Record<LogoSize, { px: number; text: string; gap: string }> = {
  sm: { px: 28, text: "text-base", gap: "gap-2" },
  md: { px: 40, text: "text-xl", gap: "gap-3" },
  lg: { px: 64, text: "text-3xl", gap: "gap-4" },
};

const ASPECT = 80 / 98;

export function Logo({
  size = "md",
  iconOnly = false,
  className,
  wordmark = "Zim Twitchers",
}: LogoProps) {
  const { px, text, gap } = SIZES[size];
  const width = Math.round(px * ASPECT);

  return (
    <span className={cn("inline-flex items-center", gap, className)}>
      <Image
        src="/logo/pitta-hero.svg"
        alt={iconOnly ? wordmark : ""}
        aria-hidden={iconOnly ? undefined : true}
        width={width}
        height={px}
        priority
        unoptimized
      />
      {iconOnly ? null : (
        <span
          className={cn(
            "font-serif font-medium leading-none tracking-tight text-forest",
            text,
          )}
        >
          {wordmark}
        </span>
      )}
    </span>
  );
}
