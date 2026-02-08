import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm";
import { TimetableList } from "../components/timetable/TimetableList";
import { createTimetableEntry, listTimetableEntries } from "../features/timetable/api";

export function TimetablePage() {
  const { userId, userReady, authReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const createTimetableMutation = useMutation({
    mutationFn: createTimetableEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["timetable", userId] });
      await queryClient.invalidateQueries({ queryKey: ["current-class", userId] });
      addToast("Class added to timetable!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to add entry", "error");
    }
  });

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-sky-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Timetable</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your weekly class schedule
        </p>
      </div>

      <TimetableEntryForm
        disabled={!userReady || !authReady || createTimetableMutation.isPending}
        onCreate={async (payload) => {
          await createTimetableMutation.mutateAsync(payload);
        }}
      />

      {timetableQuery.isLoading ? (
        <div className="space-y-3">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-3/4" />
        </div>
      ) : (
        <TimetableList entries={timetableQuery.data ?? []} />
      )}
    </div>
  );
}
