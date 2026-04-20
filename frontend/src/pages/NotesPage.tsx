import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CurrentClassCard } from "../components/timetable/CurrentClassCard";
import { NoteComposer } from "../components/notes/NoteComposer";
import {
  analyzeGoogleClassroomMaterial,
  askGoogleClassroomMaterial,
  listGoogleClassroomMaterials
} from "../features/google-classroom/api";
import { assistText, createNote, listNotes, summarizeNote } from "../features/notes/api";
import { getCurrentClass } from "../features/timetable/api";
import { isLikelySameCourse } from "../utils/course-matching";

export function NotesPage() {
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

  const notesQuery = useQuery({
    queryKey: ["notes", currentClassQuery.data?.id, userId],
    queryFn: () => listNotes(currentClassQuery.data!.id),
    enabled: Boolean(currentClassQuery.data?.id) && userReady
  });

  const classroomMaterialsQuery = useQuery({
    queryKey: ["google-classroom-materials", userId],
    queryFn: listGoogleClassroomMaterials,
    enabled: userReady,
    retry: false
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

  const assistTextMutation = useMutation({
    mutationFn: ({ text, question }: { text: string; question: string }) => assistText(text, question),
    onError: (error) => {
      addToast((error as Error).message || "Failed to ask AI about your note", "error");
    }
  });

  const summarizeMaterialMutation = useMutation({
    mutationFn: analyzeGoogleClassroomMaterial,
    onError: (error) => {
      addToast((error as Error).message || "Failed to summarize material", "error");
    }
  });

  const askMaterialMutation = useMutation({
    mutationFn: ({ materialId, question }: { materialId: string; question: string }) =>
      askGoogleClassroomMaterial(materialId, question),
    onError: (error) => {
      addToast((error as Error).message || "Failed to ask about material", "error");
    }
  });

  const materialsForCurrentClass = useMemo(() => {
    const activeClass = currentClassQuery.data;
    const materials = classroomMaterialsQuery.data ?? [];

    if (!activeClass) {
      return [];
    }

    return materials.filter((material) => isLikelySameCourse(activeClass.subjectName, material.courseName ?? ""));
  }, [classroomMaterialsQuery.data, currentClassQuery.data]);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-teal-700 dark:text-teal-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Capture notes for your current class and create concise summaries
        </p>
      </div>

      <CurrentClassCard activeClass={currentClassQuery.data ?? null} />

      <NoteComposer
        activeClass={currentClassQuery.data ?? null}
        notes={notesQuery.data ?? []}
        enableSlashCommands
        classroomMaterials={materialsForCurrentClass}
        onCreateNote={async ({ timetableId, sessionDate, content }) => {
          await createNoteMutation.mutateAsync({ timetableId, sessionDate, content });
        }}
        onSummarize={async (noteId) => {
          await summarizeMutation.mutateAsync(noteId);
        }}
        onAssistText={async ({ text, question }) => {
          return assistTextMutation.mutateAsync({ text, question });
        }}
        onSummarizeMaterial={async (materialId) => {
          const analysis = await summarizeMaterialMutation.mutateAsync(materialId);
          return { summary: analysis.summary };
        }}
        onAskMaterial={async ({ materialId, question }) => {
          return askMaterialMutation.mutateAsync({ materialId, question });
        }}
      />
    </div>
  );
}
