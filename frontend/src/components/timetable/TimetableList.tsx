import { CalendarDays, Clock, GraduationCap, PencilLine, Trash2 } from "lucide-react";
import clsx from "clsx";

import type { TimetableEntry, DayOfWeek } from "../../types/domain";
import { DAYS_OF_WEEK } from "../../types/domain";

type Props = {
  entries: TimetableEntry[];
  selectedEntryId?: string | null;
  onEdit?: (entry: TimetableEntry) => void;
  onDelete?: (entry: TimetableEntry) => void;
  onOpenNotes?: (entry: TimetableEntry) => void;
  title?: string;
  description?: string;
};

const DAY_COLORS: Record<DayOfWeek, { bg: string; text: string; dot: string }> = {
  MONDAY: { bg: "bg-teal-100 dark:bg-teal-950/40", text: "text-teal-800 dark:text-teal-200", dot: "bg-teal-600" },
  TUESDAY: { bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-800 dark:text-cyan-200", dot: "bg-cyan-600" },
  WEDNESDAY: { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  THURSDAY: { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-600" },
  FRIDAY: { bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
  SATURDAY: { bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
  SUNDAY: { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

function formatDay(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function TimetableList({
  entries,
  selectedEntryId,
  onEdit,
  onDelete,
  onOpenNotes,
  title = "Weekly Schedule",
  description
}: Props) {
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
    <section className="animate-fade-in-up rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)] backdrop-blur-sm dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description ??
                `${entries.length} ${entries.length === 1 ? "class" : "classes"} across ${daysWithEntries.length} ${
                  daysWithEntries.length === 1 ? "day" : "days"
                }`}
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
                      role={onOpenNotes ? "button" : undefined}
                      tabIndex={onOpenNotes ? 0 : undefined}
                      onClick={onOpenNotes ? () => onOpenNotes(entry) : undefined}
                      onKeyDown={
                        onOpenNotes
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onOpenNotes(entry);
                              }
                            }
                          : undefined
                      }
                      className={clsx(
                        "group relative flex items-start gap-3 rounded-2xl border p-3.5 transition-all duration-200 hover:shadow-md",
                        onOpenNotes &&
                          "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40",
                        selectedEntryId === entry.id
                          ? "border-teal-500/70 bg-teal-50/80 shadow-md dark:border-teal-500/70 dark:bg-teal-950/20"
                          : "border-stone-200/80 bg-stone-50/80 hover:border-stone-300 dark:border-slate-700/60 dark:bg-slate-800/40 dark:hover:border-slate-600/80"
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
                      {(onEdit || onDelete) && (
                        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEdit(entry);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                            >
                              <PencilLine className="h-3 w-3" />
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(entry);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-slate-900/80 dark:text-rose-300"
                              aria-label={`Delete ${entry.subjectName}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
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
