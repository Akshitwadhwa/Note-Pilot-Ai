import { CalendarDays, Clock, BookOpen, GraduationCap } from "lucide-react";
import clsx from "clsx";

import type { TimetableEntry, DayOfWeek } from "../../types/domain";
import { DAYS_OF_WEEK } from "../../types/domain";

type Props = {
  entries: TimetableEntry[];
};

const DAY_COLORS: Record<DayOfWeek, { bg: string; text: string; dot: string }> = {
  MONDAY: { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  TUESDAY: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  WEDNESDAY: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  THURSDAY: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  FRIDAY: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  SATURDAY: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  SUNDAY: { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

function formatDay(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function TimetableList({ entries }: Props) {
  // Group entries by day
  const grouped = DAYS_OF_WEEK.reduce<Partial<Record<DayOfWeek, TimetableEntry[]>>>((acc, day) => {
    const dayEntries = entries.filter((e) => e.dayOfWeek === day);
    if (dayEntries.length > 0) {
      // Sort by start time
      acc[day] = dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return acc;
  }, {});

  const daysWithEntries = Object.keys(grouped) as DayOfWeek[];

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm animate-fade-in-up dark:border-slate-800/60 dark:bg-slate-900/80 dark:shadow-slate-900/20">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Weekly Schedule</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {entries.length} {entries.length === 1 ? "class" : "classes"} across {daysWithEntries.length} {daysWithEntries.length === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <CalendarDays className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">No classes scheduled</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Add your first class using the form above
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {daysWithEntries.map((day) => {
            const dayEntries = grouped[day]!;
            const colors = DAY_COLORS[day];
            return (
              <div key={day} className="animate-fade-in">
                {/* Day Header */}
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className={clsx("h-2.5 w-2.5 rounded-full", colors.dot)} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {formatDay(day)}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}
                  </span>
                </div>

                {/* Class Cards */}
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={clsx(
                        "group relative flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md",
                        "border-slate-200/60 bg-white hover:border-slate-300/80",
                        "dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:border-slate-600/60"
                      )}
                    >
                      {/* Color accent bar */}
                      <div className={clsx("mt-0.5 h-10 w-1 flex-shrink-0 rounded-full", colors.dot)} />

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {entry.subjectName}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium">{entry.startTime}</span>
                          <span className="text-slate-300 dark:text-slate-600">–</span>
                          <span className="font-medium">{entry.endTime}</span>
                        </div>
                      </div>

                      <span
                        className={clsx(
                          "flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {entry.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
