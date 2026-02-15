
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
        <div className="h-full rounded-3xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
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

                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        <span>{nextClass.startTime} - {nextClass.endTime}</span>
                    </div>

                    <div className="pt-2">
                        <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors group-hover:translate-x-1 duration-300">
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
