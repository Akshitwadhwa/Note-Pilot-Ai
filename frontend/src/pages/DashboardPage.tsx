import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CurrentClassCard } from "../components/timetable/CurrentClassCard";
import { NextClassCard } from "../components/timetable/NextClassCard";
// import { TimetableEntryForm } from "../components/timetable/TimetableEntryForm"; // Removed for cleaner dashboard
import { TimetableList } from "../components/timetable/TimetableList";
import { NoteComposer } from "../components/notes/NoteComposer";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import {
  getCurrentClass,
  listTimetableEntries
} from "../features/timetable/api";

export function DashboardPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const currentClassQuery = useQuery({
    queryKey: ["current-class", userId],
    queryFn: getCurrentClass,
    enabled: userReady,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
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
    <div className="space-y-8 stagger-children pb-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-sky-100 rounded-xl dark:bg-sky-900/30">
              <LayoutDashboard className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Welcome back, here's your academic overview.
          </p>
        </div>
      </header>

      {/* Hero Section: Current & Next Class */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CurrentClassCard activeClass={currentClassQuery.data ?? null} />
        </div>
        <div className="lg:col-span-1 h-full">
          <NextClassCard entries={timetableQuery.data ?? []} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Content Area: Notes taking takes precedence during class */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Smart Notes</h2>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold dark:bg-indigo-900/50 dark:text-indigo-300">AI Enabled</span>
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

        {/* Sidebar Area: Schedule */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Your Schedule</h2>
          </div>
          {timetableQuery.isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          ) : (
            <TimetableList entries={timetableQuery.data ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
