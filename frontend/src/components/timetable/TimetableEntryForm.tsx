import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Clock, BookOpen, Plus, ArrowRight } from "lucide-react";
import clsx from "clsx";

import { DAYS_OF_WEEK } from "../../types/domain";
import type { DayOfWeek } from "../../types/domain";

type Props = {
  disabled?: boolean;
  onCreate: (payload: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    subjectName: string;
  }) => Promise<void>;
};

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const inputClasses =
  "w-full rounded-2xl border border-stone-200 bg-stone-50/85 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-stone-400 transition-all duration-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:ring-teal-400/15 disabled:cursor-not-allowed disabled:opacity-50";

export function TimetableEntryForm({ disabled, onCreate }: Props) {
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectName, setSubjectName] = useState("");
  const trimmedSubjectName = subjectName.trim();
  const isInvalid = !trimmedSubjectName || !startTime || !endTime;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isInvalid) return;

    try {
      await onCreate({ dayOfWeek, startTime, endTime, subjectName: trimmedSubjectName });
      setSubjectName("");
    } catch {
      // Mutation-level handlers already surface API errors via toast.
    }
  }

  return (
    <section className="animate-fade-in-up rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Class</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Schedule a new class to your timetable</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Day Picker - Pill buttons */}
        <div>
          <label className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Day of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => setDayOfWeek(day)}
                className={clsx(
                  "rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                  dayOfWeek === day
                    ? "scale-[1.02] bg-slate-900 text-white shadow-md dark:bg-teal-700"
                    : "bg-stone-100 text-slate-600 hover:bg-stone-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                )}
              >
                <span className="hidden sm:inline">{day.charAt(0) + day.slice(1).toLowerCase()}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time & Subject Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Start Time */}
          <div className="group">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              Start Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className={inputClasses}
                disabled={disabled}
              />
            </div>
          </div>

          {/* End Time */}
          <div className="group">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              End Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className={inputClasses}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Subject */}
          <div className="group">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <BookOpen className="h-3.5 w-3.5" />
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Data Structures"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              className={inputClasses}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Preview Chip + Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Preview */}
          {trimmedSubjectName && (
            <div className="animate-fade-in flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <span className="font-semibold text-teal-800 dark:text-teal-300">{DAY_SHORT[dayOfWeek]}</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span>{startTime}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span>{endTime}</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{trimmedSubjectName}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={disabled || isInvalid}
            className={clsx(
              "group/btn ml-auto inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200",
              "bg-slate-900 hover:bg-slate-800 active:scale-[0.97] dark:bg-teal-700 dark:hover:bg-teal-600",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md"
            )}
          >
            <Plus className="h-4 w-4 transition-transform group-hover/btn:rotate-90" />
            Add to Schedule
          </button>
        </div>
      </form>
    </section>
  );
}
