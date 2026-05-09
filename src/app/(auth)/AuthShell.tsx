import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          🦜 Zim Twitchers
        </Link>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </Card>
    </main>
  );
}
