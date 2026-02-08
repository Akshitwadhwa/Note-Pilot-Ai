import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CurrentClassCard } from "../components/timetable/CurrentClassCard";
import { NoteComposer } from "../components/notes/NoteComposer";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import { getCurrentClass } from "../features/timetable/api";

export function NotesPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const currentClassQuery = useQuery({
    queryKey: ["current-class", userId],
    queryFn: getCurrentClass,
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
    <div className="space-y-6 stagger-children">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-sky-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Take notes for your current class and generate AI summaries
        </p>
      </div>

      <CurrentClassCard activeClass={currentClassQuery.data ?? null} />

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
