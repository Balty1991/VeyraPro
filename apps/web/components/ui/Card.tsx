import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-card border border-border bg-surface p-5 shadow-sm", className)} {...props} />;
}
