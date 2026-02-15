import { useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Clock, BookOpen, Plus } from "lucide-react";

import { DAYS_OF_WEEK } from "../../types/domain";
import type { DayOfWeek } from "../../types/domain";
import { Card } from "../common/Card";

type Props = {
  disabled?: boolean;
  onCreate: (payload: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    subjectName: string;
  }) => Promise<void>;
};

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20 disabled:opacity-50 disabled:cursor-not-allowed";

export function TimetableEntryForm({ disabled, onCreate }: Props) {
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectName, setSubjectName] = useState("");
  const trimmedSubjectName = subjectName.trim();
  const isInvalid = !trimmedSubjectName || !startTime || !endTime;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isInvalid) {
      return;
    }

    await onCreate({ dayOfWeek, startTime, endTime, subjectName: trimmedSubjectName });
    setSubjectName("");
  }

  return (
    <Card
      title="Add Class"
      titleIcon={<CalendarDays className="h-5 w-5 text-sky-500" />}
    >
      <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <CalendarDays className="h-3.5 w-3.5" />
            Day
          </label>
          <select
            className={inputClasses}
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(event.target.value as DayOfWeek)}
            disabled={disabled}
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Clock className="h-3.5 w-3.5" />
            Start Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className={inputClasses}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Clock className="h-3.5 w-3.5" />
            End Time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className={inputClasses}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            <BookOpen className="h-3.5 w-3.5" />
            Subject
          </label>
          <input
            type="text"
            placeholder="Subject name"
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            className={inputClasses}
            disabled={disabled}
          />
        </div>

        <button
          type="submit"
          disabled={disabled || isInvalid}
          className="sm:col-span-2 lg:col-span-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </button>
      </form>
    </Card>
  );
}
