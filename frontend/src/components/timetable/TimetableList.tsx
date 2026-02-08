import { CalendarDays } from "lucide-react";

import type { TimetableEntry } from "../../types/domain";
import { Card } from "../common/Card";

type Props = {
  entries: TimetableEntry[];
};

export function TimetableList({ entries }: Props) {
  return (
    <Card
      title="Weekly Timetable"
      titleIcon={<CalendarDays className="h-5 w-5 text-sky-500" />}
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-400">
            No timetable entries yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Add your first class using the form above
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Day
                </th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Subject
                </th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Start
                </th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  End
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 transition-colors even:bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:even:bg-slate-800/30 dark:hover:bg-slate-800/50"
                >
                  <td className="py-3 px-4">
                    <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                      {entry.dayOfWeek}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {entry.subjectName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {entry.startTime}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {entry.endTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
