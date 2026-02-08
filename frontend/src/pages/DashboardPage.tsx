import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CurrentClassCard } from "../components/timetable/CurrentClassCard";
import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm";
import { TimetableList } from "../components/timetable/TimetableList";
import { NoteComposer } from "../components/notes/NoteComposer";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import {
  createTimetableEntry,
  getCurrentClass,
  listTimetableEntries
} from "../features/timetable/api";

export function DashboardPage() {
  const { userId, userReady, authReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const currentClassQuery = useQuery({
    queryKey: ["current-class", userId],
    queryFn: getCurrentClass,
    enabled: userReady
  });

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const notesQuery = useQuery({
    queryKey: ["notes", currentClassQuery.data?.id, userId],
    queryFn: () => listNotes(currentClassQuery.data!.id),
    enabled: Boolean(currentClassQuery.data?.id) && userReady
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

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", currentClassQuery.data?.id, userId]
      });
      addToast("Note saved!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to save note", "error");
    }
  });

  const summarizeMutation = useMutation({
    mutationFn: summarizeNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", currentClassQuery.data?.id, userId]
      });
      addToast("Summary generated!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to generate summary", "error");
    }
  });

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-sky-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Overview of your classes and notes
        </p>
      </div>

      <TimetableEntryForm
        disabled={!userReady || !authReady || createTimetableMutation.isPending}
        onCreate={async (payload) => {
          await createTimetableMutation.mutateAsync(payload);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentClassCard activeClass={currentClassQuery.data ?? null} />
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

      <NoteComposer
        activeClass={currentClassQuery.data ?? null}
        notes={notesQuery.data ?? []}
        onCreateNote={async ({ timetableId, content }) => {
          await createNoteMutation.mutateAsync({ timetableId, content });
        }}
        onSummarize={async (noteId) => {
          await summarizeMutation.mutateAsync(noteId);
        }}
      />
    </div>
  );
}
