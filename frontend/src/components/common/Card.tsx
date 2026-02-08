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
        "rounded-2xl border p-5 shadow-sm animate-fade-in-up",
        "border-slate-200/60 bg-white/80 backdrop-blur-sm",
        "dark:border-slate-800/60 dark:bg-slate-900/80 dark:shadow-slate-900/20",
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
