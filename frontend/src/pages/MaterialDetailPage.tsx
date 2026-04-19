import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpenText,
  Brain,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileStack,
  FolderKanban,
  Loader2,
  Save,
  Sparkles
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Card } from "../components/common/Card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  analyzeGoogleClassroomMaterial,
  generateGoogleClassroomMaterialQuiz,
  generateGoogleClassroomQuizPrep,
  getGoogleClassroomMaterialDetail,
  submitGoogleClassroomQuizAttempt
} from "../features/google-classroom/api";
import { createNote, listNotes, summarizeNote } from "../features/notes/api";
import { listTimetableEntries } from "../features/timetable/api";
import { isLikelySameCourse } from "../utils/course-matching";
import { buildMaterialNoteContent } from "../utils/material-note";

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSourceType(sourceType: string) {
  return sourceType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildNoteSection(label: string, content?: string | null) {
  const trimmed = content?.trim();
  if (!trimmed) {
    return "";
  }

  return `${label}\n${trimmed}\n`;
}

export function MaterialDetailPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lastSubmittedQuizId, setLastSubmittedQuizId] = useState<string | null>(null);
  const [prepAnswers, setPrepAnswers] = useState<Record<string, string>>({});
  const [showPrepResults, setShowPrepResults] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const detailQuery = useQuery({
    queryKey: ["google-classroom-material-detail", materialId, userId],
    queryFn: () => getGoogleClassroomMaterialDetail(materialId!),
    enabled: Boolean(materialId) && userReady
  });

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const quizPrepQuery = useQuery({
    queryKey: ["google-classroom-quiz-prep", materialId, userId],
    queryFn: () => generateGoogleClassroomQuizPrep(materialId!),
    enabled: Boolean(materialId) && userReady && Boolean(detailQuery.data),
    retry: false,
    refetchOnWindowFocus: false
  });

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeGoogleClassroomMaterial(materialId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      await queryClient.invalidateQueries({ queryKey: ["google-classroom-materials", userId] });
      addToast("AI analysis created", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to analyze material", "error");
    }
  });

  const quizMutation = useMutation({
    mutationFn: () => generateGoogleClassroomMaterialQuiz(materialId!),
    onSuccess: async () => {
      setLastSubmittedQuizId(null);
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      addToast("Quiz generated", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to generate quiz", "error");
    }
  });

  const submitAttemptMutation = useMutation({
    mutationFn: (quizId: string) =>
      submitGoogleClassroomQuizAttempt(
        quizId,
        Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
      ),
    onSuccess: async (result) => {
      setLastSubmittedQuizId(result.quizId);
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      addToast(`Quiz submitted: ${result.score}/${result.totalQuestions}`, "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to submit quiz", "error");
    }
  });

  const matchedTimetableEntry = useMemo(() => {
    const material = detailQuery.data;
    const entries = timetableQuery.data ?? [];

    if (!material?.courseName) {
      return null;
    }

    return entries.find((entry) => isLikelySameCourse(entry.subjectName, material.courseName ?? "")) ?? null;
  }, [detailQuery.data, timetableQuery.data]);

  const notesQuery = useQuery({
    queryKey: ["notes", matchedTimetableEntry?.id, userId],
    queryFn: () => listNotes(matchedTimetableEntry!.id),
    enabled: Boolean(matchedTimetableEntry?.id) && userReady
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      setNoteContent("");
      await queryClient.invalidateQueries({
        queryKey: ["notes", matchedTimetableEntry?.id, userId]
      });
      addToast("Note saved for this class", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to save note", "error");
    }
  });

  const summarizeNoteMutation = useMutation({
    mutationFn: summarizeNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["notes", matchedTimetableEntry?.id, userId]
      });
      addToast("Summary generated!", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to generate summary", "error");
    }
  });

  const latestQuiz = useMemo(() => detailQuery.data?.quizzes?.[0] ?? null, [detailQuery.data?.quizzes]);
  const latestAttempt = useMemo(() => {
    if (!detailQuery.data?.attempts?.length || !latestQuiz) {
      return null;
    }

    if (lastSubmittedQuizId) {
      return (
        detailQuery.data.attempts.find((attempt) => attempt.quizId === lastSubmittedQuizId) ?? null
      );
    }

    return detailQuery.data.attempts.find((attempt) => attempt.quizId === latestQuiz.id) ?? null;
  }, [detailQuery.data?.attempts, lastSubmittedQuizId, latestQuiz]);

  useEffect(() => {
    if (!latestQuiz?.questions?.length) {
      setAnswers({});
      return;
    }

    setAnswers(
      latestQuiz.questions.reduce<Record<string, string>>((acc, question) => {
        acc[question.id] = "";
        return acc;
      }, {})
    );
  }, [latestQuiz?.id, latestQuiz?.questions]);

  useEffect(() => {
    if (!quizPrepQuery.data?.practiceQuestions?.length) {
      setPrepAnswers({});
      setShowPrepResults(false);
      return;
    }

    setPrepAnswers(
      quizPrepQuery.data.practiceQuestions.reduce<Record<string, string>>((acc, _question, index) => {
        acc[String(index)] = "";
        return acc;
      }, {})
    );
    setShowPrepResults(false);
  }, [quizPrepQuery.data]);

  async function handleSaveMaterialNote() {
    if (!matchedTimetableEntry || !noteContent.trim()) {
      return;
    }

    await createNoteMutation.mutateAsync({
      timetableId: matchedTimetableEntry.id,
      content: noteContent.trim()
    });
  }

  function appendToDraft(section: string) {
    if (!section.trim()) {
      return;
    }

    setNoteContent((current) => {
      const normalizedCurrent = current.trimEnd();
      return normalizedCurrent ? `${normalizedCurrent}\n\n${section.trim()}` : section.trim();
    });
  }

  if (!materialId) {
    return <Navigate to="/materials" replace />;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-14 w-44 rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-[32px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-[28rem] rounded-[28px]" />
          <div className="skeleton h-[28rem] rounded-[28px]" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card>
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {(detailQuery.error as Error)?.message || "Material could not be loaded."}
        </p>
      </Card>
    );
  }

  const material = detailQuery.data;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          to="/materials"
          className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to materials
        </Link>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-[var(--app-shadow)]">
        <div className="border-b border-[color:var(--app-border)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),linear-gradient(140deg,#111827,#0f766e_62%,#1f2937)] px-6 py-8 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                {formatSourceType(material.sourceType)}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{material.title}</h1>
              <p className="mt-3 text-sm leading-6 text-white/80">
                {material.description || "No description was provided for this Classroom item."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Published
              </p>
              <p className="mt-2 text-lg font-semibold">{formatTimestamp(material.publishedAt ?? material.createdAt)}</p>
              <p className="mt-1 text-sm text-white/75">{material.courseName ?? "Unknown course"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 md:grid-cols-4">
          <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Source Type
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatSourceType(material.sourceType)}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Attachments
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {material.attachments.length}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              AI Analysis
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {material.analysis ? "Ready" : "Pending"}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Quizzes
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {material.quizzes.length}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <Card title="Material Metadata" titleIcon={<FolderKanban className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-slate-400" />
                <span>{material.courseName ?? "Unknown course"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>{formatTimestamp(material.publishedAt ?? material.createdAt)}</span>
              </div>
              {material.alternateLink ? (
                <a
                  href={material.alternateLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 font-medium text-slate-800 transition-colors hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Classroom
                </a>
              ) : null}
            </div>
          </Card>

          <Card title="Attachments" titleIcon={<FileStack className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
            {material.attachments.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No attachments were included with this Classroom item.
              </p>
            ) : (
              <div className="space-y-3">
                {material.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-2xl border border-[color:var(--app-border)] bg-stone-50/80 p-4 dark:bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {attachment.title || "Untitled attachment"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          {formatSourceType(attachment.attachmentType)}
                        </p>
                      </div>
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                        >
                          Open
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                    {attachment.mimeType ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{attachment.mimeType}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-[color:var(--app-border)] pt-5">
              <button
                type="button"
                onClick={() => setShowNotesPanel(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                <Save className="h-4 w-4" />
                Make Notes Of This
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Open a side panel with this announcement, its attachments, and your class notes.
              </p>
            </div>
          </Card>

          <Card title="Material Summary" titleIcon={<BookOpenText className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This summary is built from your uploaded course handouts and related synced course materials for this item.
              </p>
              <button
                type="button"
                onClick={() => void quizPrepQuery.refetch()}
                disabled={quizPrepQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {quizPrepQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Refresh summary
              </button>
            </div>

            {quizPrepQuery.isLoading ? (
              <div className="mt-5 space-y-3">
                <div className="skeleton h-28 rounded-2xl" />
                <div className="skeleton h-20 rounded-2xl" />
              </div>
            ) : quizPrepQuery.isError ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                {(quizPrepQuery.error as Error).message ||
                  "Material summary could not be generated yet. Upload course handouts for this subject or sync more related course materials."}
              </div>
            ) : quizPrepQuery.data ? (
              <div className="mt-5 space-y-6">
                <div className="rounded-2xl bg-stone-50/90 p-4 dark:bg-slate-900/50">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Topic
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {quizPrepQuery.data.topic}
                  </p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {quizPrepQuery.data.noteTitle}
                  </p>
                  <div className="mt-4 space-y-4">
                    {quizPrepQuery.data.noteSections.map((section) => (
                      <div
                        key={section.heading}
                        className="rounded-2xl border border-[color:var(--app-border)] p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {section.heading}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {quizPrepQuery.data.practiceQuestions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Practice Quiz
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPrepResults(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Check answers
                      </button>
                    </div>

                    {quizPrepQuery.data.practiceQuestions.map((question, index) => (
                      <div
                        key={`${question.question}-${index}`}
                        className="rounded-2xl border border-[color:var(--app-border)] p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {index + 1}. {question.question}
                        </p>

                        <div className="mt-4 space-y-2">
                          {question.options.map((option) => (
                            <label
                              key={option}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-stone-50 dark:text-slate-200 dark:hover:bg-slate-900/40"
                            >
                              <input
                                type="radio"
                                name={`prep-${index}`}
                                value={option}
                                checked={prepAnswers[String(index)] === option}
                                onChange={(event) =>
                                  setPrepAnswers((current) => ({
                                    ...current,
                                    [String(index)]: event.target.value
                                  }))
                                }
                                className="h-4 w-4"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>

                        {showPrepResults ? (
                          <div className="mt-4 rounded-xl bg-stone-50/90 p-3 text-sm dark:bg-slate-900/50">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              Correct answer: {question.answer}
                            </p>
                            {question.explanation ? (
                              <p className="mt-1 text-slate-600 dark:text-slate-300">{question.explanation}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {quizPrepQuery.data.sources.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Sources Used
                    </p>
                    <div className="mt-3 space-y-2">
                      {quizPrepQuery.data.sources.map((source, index) => (
                        <div
                          key={`${source.label}-${index}`}
                          className="rounded-2xl bg-stone-50/90 p-3 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
                        >
                          <p className="font-semibold">{source.label}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            {source.kind.replace("_", " ")}
                          </p>
                          <p className="mt-2 text-sm leading-6">{source.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="AI Analysis" titleIcon={<Brain className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Generate a student-friendly summary, key points, and topic tags from the synced material metadata.
              </p>
              <button
                type="button"
                onClick={() => void analyzeMutation.mutateAsync()}
                disabled={analyzeMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {material.analysis ? "Refresh analysis" : "Generate analysis"}
              </button>
            </div>

            {material.analysis ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl bg-stone-50/90 p-4 dark:bg-slate-900/50">
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {material.analysis.summary}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Key Points
                  </p>
                  <div className="mt-3 space-y-2">
                    {material.analysis.keyPoints.map((point) => (
                      <div
                        key={point}
                        className="rounded-2xl border border-[color:var(--app-border)] px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Topic Tags
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {material.analysis.topicTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                No analysis has been generated for this material yet.
              </p>
            )}
          </Card>

          <Card title="Quiz" titleIcon={<CheckCircle2 className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Generate a multiple-choice quiz from this material and submit an attempt directly in the app.
              </p>
              <button
                type="button"
                onClick={() => void quizMutation.mutateAsync()}
                disabled={quizMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {quizMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {latestQuiz ? "Regenerate quiz" : "Generate quiz"}
              </button>
            </div>

            {latestQuiz?.questions?.length ? (
              <div className="mt-5 space-y-6">
                <div className="rounded-2xl bg-stone-50/90 p-4 dark:bg-slate-900/50">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{latestQuiz.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {latestQuiz.instructions || "Select one answer for each question."}
                  </p>
                </div>

                {latestQuiz.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-[color:var(--app-border)] p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {index + 1}. {question.question}
                    </p>

                    <div className="mt-4 space-y-2">
                      {(question.options ?? []).map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-stone-50 dark:text-slate-200 dark:hover:bg-slate-900/40"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value
                              }))
                            }
                            className="h-4 w-4"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>

                    {latestAttempt?.quizId === latestQuiz.id &&
                    latestAttempt.answers.some((answer) => answer.questionId === question.id) ? (
                      <div className="mt-4 rounded-xl bg-stone-50/90 p-3 text-sm dark:bg-slate-900/50">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          Correct answer: {question.answer}
                        </p>
                        {question.explanation ? (
                          <p className="mt-1 text-slate-600 dark:text-slate-300">{question.explanation}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => latestQuiz && submitAttemptMutation.mutateAsync(latestQuiz.id)}
                  disabled={submitAttemptMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {submitAttemptMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Submit attempt
                </button>

                {latestAttempt ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Latest score: {latestAttempt.score}/{latestAttempt.totalQuestions}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      Submitted {formatTimestamp(latestAttempt.createdAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                No quiz exists for this material yet.
              </p>
            )}
          </Card>
        </div>
      </div>

      {showNotesPanel ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setShowNotesPanel(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-stone-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Material Notes
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {material.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{material.courseName ?? "Unknown course"}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{formatTimestamp(material.publishedAt ?? material.createdAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesPanel(false)}
                className="rounded-2xl border border-stone-200 p-2 text-slate-500 transition-colors hover:bg-stone-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close material notes panel"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <div className="rounded-3xl border border-stone-200/80 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Announcement
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        appendToDraft(
                          buildNoteSection("Announcement", material.description || material.title)
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Add to note
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-slate-200">
                    {material.description || "No description was provided for this Classroom item."}
                  </p>
                </div>

                {material.analysis ? (
                  <div className="rounded-3xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Material Summary
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          appendToDraft(
                            buildNoteSection(
                              "Material summary",
                              buildMaterialNoteContent({
                                title: material.title,
                                analysis: material.analysis,
                                extractedText: material.extractedText,
                                description: material.description,
                                attachments: material.attachments
                              })
                            )
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-white dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Add to note
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-900 dark:text-emerald-100">
                      {material.analysis.summary}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      No AI summary yet for this material.
                    </p>
                    <button
                      type="button"
                      onClick={() => void analyzeMutation.mutateAsync()}
                      disabled={analyzeMutation.isPending}
                      className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
                    >
                      {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate summary
                    </button>
                  </div>
                )}

                {material.extractedText?.trim() ? (
                  <div className="rounded-3xl border border-stone-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Material Context
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          appendToDraft(
                            buildNoteSection(
                              "Material context",
                              material.extractedText?.slice(0, 1200) ?? ""
                            )
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Add excerpt
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                      {material.extractedText.slice(0, 600)}
                      {material.extractedText.length > 600 ? "..." : ""}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-3xl border border-stone-200/80 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Attached Materials
                  </p>
                  {material.attachments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      No attachments were included with this announcement.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {material.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {attachment.title || "Untitled attachment"}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                {formatSourceType(attachment.attachmentType)}
                              </p>
                            </div>
                            {attachment.url ? (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                              >
                                Open
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Attachments stay available here while you write, so you can open the original file and keep your notes in the same side panel.
                  </p>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Add Note
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {material.description ? (
                        <button
                          type="button"
                          onClick={() =>
                            appendToDraft(
                              buildNoteSection("Announcement", material.description || material.title)
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          Add announcement
                        </button>
                      ) : null}
                      {material.analysis?.summary ? (
                        <button
                          type="button"
                          onClick={() =>
                            appendToDraft(
                              buildNoteSection(
                                "Material summary",
                                buildMaterialNoteContent({
                                  title: material.title,
                                  analysis: material.analysis,
                                  extractedText: material.extractedText,
                                  description: material.description,
                                  attachments: material.attachments
                                })
                              )
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                        >
                          Add summary
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {matchedTimetableEntry ? (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Saving into <span className="font-semibold">{matchedTimetableEntry.subjectName}</span>.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      This material is not matched to a class in your timetable yet, so notes cannot be saved from here.
                    </p>
                  )}
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    rows={6}
                    placeholder="Write your notes from this announcement or material..."
                    className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-stone-400 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSaveMaterialNote()}
                      disabled={!matchedTimetableEntry || !noteContent.trim() || createNoteMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                    >
                      <Save className="h-4 w-4" />
                      {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200/80 bg-stone-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Saved Notes
                    </p>
                    {notesQuery.data?.length ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        {notesQuery.data.length}
                      </span>
                    ) : null}
                  </div>
                  {matchedTimetableEntry ? (
                    notesQuery.isLoading ? (
                      <div className="mt-3 space-y-3">
                        <div className="skeleton h-20 rounded-2xl" />
                        <div className="skeleton h-20 rounded-2xl" />
                      </div>
                    ) : !notesQuery.data?.length ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        No notes yet for this matched class.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {notesQuery.data.map((note) => (
                          <article
                            key={note.id}
                            className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                          >
                            <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                              {note.content}
                            </p>
                            {note.timestamp ? (
                              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                {new Date(note.timestamp).toLocaleString()}
                              </p>
                            ) : null}
                            {note.summary ? (
                              <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                                {note.summary}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void summarizeNoteMutation.mutateAsync(note.id)}
                                disabled={summarizeNoteMutation.isPending}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                {summarizeNoteMutation.isPending ? "Generating..." : "Generate Summary"}
                              </button>
                            )}
                          </article>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Add this class to your timetable first to store notes from this material.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
