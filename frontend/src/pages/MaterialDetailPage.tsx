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
  NotebookTabs,
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

function isQuizLikeMaterial(title: string, description?: string | null) {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  return /\bquiz\b|\btest\b|\bexam\b|\bassessment\b/.test(haystack);
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

  const detailQuery = useQuery({
    queryKey: ["google-classroom-material-detail", materialId, userId],
    queryFn: () => getGoogleClassroomMaterialDetail(materialId!),
    enabled: Boolean(materialId) && userReady
  });

  const quizPrepQuery = useQuery({
    queryKey: ["google-classroom-quiz-prep", materialId, userId],
    queryFn: () => generateGoogleClassroomQuizPrep(materialId!),
    enabled: Boolean(materialId) && userReady && Boolean(detailQuery.data && isQuizLikeMaterial(detailQuery.data.title, detailQuery.data.description)),
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
  const shouldShowQuizPrep = isQuizLikeMaterial(material.title, material.description);

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

          {shouldShowQuizPrep ? (
            <Card title="Quiz Prep Pack" titleIcon={<NotebookTabs className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  This study note is built from your uploaded course handouts and related synced course materials for the announced quiz topic.
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
                  Refresh prep
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
                    "Quiz prep could not be generated yet. Upload course handouts for this subject or sync more related course materials."}
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
          ) : null}

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
    </div>
  );
}
