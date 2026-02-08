import { BookOpen, Clock, CalendarDays } from "lucide-react";
import clsx from "clsx";

import type { TimetableEntry } from "../../types/domain";

type Props = {
  activeClass: TimetableEntry | null;
};

export function CurrentClassCard({ activeClass }: Props) {
  return (
    <section
      className={clsx(
        "relative rounded-2xl p-6 shadow-lg animate-fade-in-up overflow-hidden",
        activeClass
          ? "bg-gradient-to-br from-sky-500 to-brand-700 text-white"
          : "border border-slate-200/60 bg-white/80 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80"
      )}
    >
      {activeClass && (
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      )}

      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen
            className={clsx(
              "h-5 w-5",
              activeClass ? "text-white/80" : "text-sky-500 dark:text-sky-400"
            )}
          />
          <h2
            className={clsx(
              "text-lg font-semibold",
              activeClass ? "text-white" : "text-slate-900 dark:text-slate-100"
            )}
          >
            Current Class
          </h2>
          {activeClass && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-ring" />
              Live
            </span>
          )}
        </div>

        {activeClass ? (
          <div className="space-y-2">
            <p className="text-2xl font-bold">{activeClass.subjectName}</p>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {activeClass.dayOfWeek}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {activeClass.startTime} - {activeClass.endTime}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <Clock className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-600 dark:text-slate-400">
              No active class right now
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Your current class will appear here during scheduled hours
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
