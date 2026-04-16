import type { PropsWithChildren, ReactNode } from "react";
import clsx from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
  title?: string;
  titleIcon?: ReactNode;
  interactive?: boolean;
}>;

export function Card({ className, title, titleIcon, children, interactive = true }: CardProps) {
  return (
    <section
      className={clsx(
        "animate-fade-in-up rounded-[28px] border p-6 shadow-[var(--app-shadow)]",
        "border-[color:var(--app-border)] bg-[color:var(--app-surface)] backdrop-blur-xl",
        "dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]",
        interactive && "interactive-card",
        className
      )}
    >
      {title ? (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {titleIcon}
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
