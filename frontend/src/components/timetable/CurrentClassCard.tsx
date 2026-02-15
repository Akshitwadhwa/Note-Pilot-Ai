import { useEffect, useState } from "react";
import { BookOpen, Clock, CalendarDays, Hourglass } from "lucide-react";
import clsx from "clsx";

import type { TimetableEntry } from "../../types/domain";

type Props = {
  activeClass: TimetableEntry | null;
};

export function CurrentClassCard({ activeClass }: Props) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!activeClass) return;

    const calculateProgress = () => {
      const now = new Date();
      const [startHour, startMinute] = activeClass.startTime.split(":").map(Number);
      const [endHour, endMinute] = activeClass.endTime.split(":").map(Number);

      const startDate = new Date(now);
      startDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date(now);
      endDate.setHours(endHour, endMinute, 0, 0);

      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();

      const newProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      setProgress(newProgress);

      // Calculate time left
      const remainingMs = endDate.getTime() - now.getTime();
      const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (1000 * 60)));

      if (remainingMinutes >= 60) {
        const h = Math.floor(remainingMinutes / 60);
        const m = remainingMinutes % 60;
        setTimeLeft(`${h}h ${m}m left`);
      } else {
        setTimeLeft(`${remainingMinutes}m left`);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeClass]);

  return (
    <section
      className={clsx(
        "relative rounded-3xl p-8 shadow-xl overflow-hidden transition-all duration-300 group",
        activeClass
          ? "bg-gradient-to-br from-sky-600 via-brand-600 to-violet-700 text-white"
          : "border border-slate-200/60 bg-white/50 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50"
      )}
    >
      {activeClass && (
        <>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-sky-400/20 blur-[60px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "p-2.5 rounded-xl backdrop-blur-sm",
              activeClass ? "bg-white/15 ring-1 ring-white/20" : "bg-sky-100 dark:bg-sky-900/30"
            )}>
              <BookOpen
                className={clsx(
                  "h-6 w-6",
                  activeClass ? "text-white" : "text-sky-600 dark:text-sky-400"
                )}
              />
            </div>
            <div>
              <h2
                className={clsx(
                  "text-sm font-bold tracking-wide uppercase opacity-80",
                  activeClass ? "text-sky-100" : "text-slate-500 dark:text-slate-400"
                )}
              >
                Current Session
              </h2>
              {/* Optional dynamic subtitle could go here */}
            </div>
          </div>

          {activeClass && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 pl-2 pr-3 py-1 text-xs font-bold text-emerald-100 border border-emerald-500/30 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              LIVE
            </span>
          )}
        </div>

        <div className="mt-8 space-y-6">
          {activeClass ? (
            <>
              <div>
                <h3 className="text-3xl font-extrabold tracking-tight leading-tight">{activeClass.subjectName}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-sky-100/90">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <CalendarDays className="h-4 w-4" />
                    {activeClass.dayOfWeek}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Clock className="h-4 w-4" />
                    {activeClass.startTime} - {activeClass.endTime}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm ml-auto">
                    <Hourglass className="h-4 w-4" />
                    {timeLeft}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-sky-200/80">
                  <span>Class Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-black/20 backdrop-blur-sm overflow-hidden ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-sky-200/50 rounded-full blur-xl animate-pulse"></div>
                <Clock className="relative h-16 w-16 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                You're free for now!
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-500 max-w-xs">
                Check your upcoming schedule or take this time to review your notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
