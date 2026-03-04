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
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20 disabled:opacity-50 disabled:cursor-not-allowed";

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
    <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-sky-50/40 p-6 shadow-sm animate-fade-in-up dark:border-slate-800/60 dark:from-slate-900/80 dark:via-slate-900/80 dark:to-sky-950/20 dark:shadow-slate-900/20">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20">
          <Plus className="h-5 w-5 text-white" />
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
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  dayOfWeek === day
                    ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/25 scale-[1.02]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400 animate-fade-in">
              <span className="font-semibold text-sky-600 dark:text-sky-400">{DAY_SHORT[dayOfWeek]}</span>
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
              "group/btn ml-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200",
              "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.97]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md disabled:from-emerald-500 disabled:to-teal-500"
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
