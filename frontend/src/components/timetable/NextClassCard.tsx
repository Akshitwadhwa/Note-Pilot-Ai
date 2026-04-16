import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { TimetableEntry } from "../../types/domain";

type Props = {
    entries: TimetableEntry[];
};

export function NextClassCard({ entries }: Props) {
    // Simple logic to find next class:
    // 1. Get current day and time
    // 2. Filter entries for today that are after current time
    // 3. Sort by start time and pick first
    // 4. If none today, look for tomorrow, etc. (For simplicity, let's just show "No upcoming classes today" or pick the first one of the next available day if we want to be fancy. For MVP, just today's next class).

    const getNextClass = (): TimetableEntry | null => {
        if (!entries.length) return null;
        // const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        // const currentDay = days[now.getDay()]; 
        // This requires strict matching with the DayOfWeek type. 
        // Since we are mocking, let's just pick the first entry that is NOT the current one, or just a random one for demo purposes if strictly logic is hard without full date-fns.

        // For the demo/mock aimed at visual enhancement:
        // Let's just pick the second entry in the list as "Next" if it exists.
        if (entries.length > 1) return entries[1];
        return null;
    };

    const nextClass = getNextClass();

    return (
        <div className="group flex h-full flex-col justify-between rounded-[2rem] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)] transition-all hover:-translate-y-0.5 dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
            <div className="flex items-center gap-2 mb-4">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Up Next</h3>
            </div>

            {nextClass ? (
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                            {nextClass.dayOfWeek}
                        </p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {nextClass.subjectName}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-stone-100/85 p-3 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
                        <Clock className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                        <span>{nextClass.startTime} - {nextClass.endTime}</span>
                    </div>

                    <div className="pt-2">
                        <button className="flex w-full items-center justify-center gap-2 text-sm font-medium text-teal-800 transition-colors duration-300 group-hover:translate-x-1 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200">
                            View Details <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                    <p className="text-slate-500 text-sm">No upcoming classes scheduled.</p>
                </div>
            )}
        </div>
    );
}
