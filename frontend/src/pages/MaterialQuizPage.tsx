import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";

import { Card } from "../components/common/Card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  generateGoogleClassroomMaterialQuiz,
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

function formatScore(score: number, totalQuestions: number) {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  return `${score}/${totalQuestions} (${percentage}%)`;
}

export function MaterialQuizPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lastSubmittedQuizId, setLastSubmittedQuizId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["google-classroom-material-detail", materialId, userId],
    queryFn: () => getGoogleClassroomMaterialDetail(materialId!),
    enabled: Boolean(materialId) && userReady
  });

  const generateQuizMutation = useMutation({
    mutationFn: () => generateGoogleClassroomMaterialQuiz(materialId!),
    onSuccess: async () => {
      setLastSubmittedQuizId(null);
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-quiz-prep", userId]
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
      setSearchParams({ view: "results" }, { replace: true });
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-material-detail", materialId, userId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["google-classroom-quiz-prep", userId]
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
      return detailQuery.data.attempts.find((attempt) => attempt.quizId === lastSubmittedQuizId) ?? null;
    }

    return detailQuery.data.attempts.find((attempt) => attempt.quizId === latestQuiz.id) ?? null;
  }, [detailQuery.data?.attempts, lastSubmittedQuizId, latestQuiz]);

  const resultsView = searchParams.get("view") === "results";

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

  if (!materialId) {
    return <Navigate to="/materials" replace />;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-14 w-44 rounded-2xl" />
        <div className="skeleton h-40 w-full rounded-[28px]" />
        <div className="skeleton h-[32rem] w-full rounded-[28px]" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card>
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {(detailQuery.error as Error)?.message || "Quiz area could not be loaded."}
        </p>
      </Card>
    );
  }

  const material = detailQuery.data;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/materials/${material.id}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to material
        </Link>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateQuizMutation.mutateAsync()}
            disabled={generateQuizMutation.isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            {generateQuizMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {latestQuiz ? "Regenerate quiz" : "Generate quiz"}
          </button>
          {latestAttempt ? (
            <button
              type="button"
              onClick={() => setSearchParams({ view: resultsView ? "attempt" : "results" }, { replace: true })}
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Trophy className="h-4 w-4" />
              {resultsView ? "Attempt mode" : "See results"}
            </button>
          ) : null}
        </div>
      </div>

      <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-[var(--app-shadow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Quiz Area
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {latestQuiz?.title ?? `Quiz for ${material.title}`}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {material.courseName ?? "Unknown subject"} • {material.title}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Latest Result
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {latestAttempt ? formatScore(latestAttempt.score, latestAttempt.totalQuestions) : "Not attempted"}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Attempts
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {detailQuery.data.attempts.length}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Created
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {latestQuiz ? formatTimestamp(latestQuiz.createdAt) : "Not created"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!latestQuiz?.questions?.length ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No quiz exists for this material yet</p>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Generate a quiz here to keep the full quiz workflow separate from the material detail page.
            </p>
          </div>
        </Card>
      ) : (
        <Card title="Questions" titleIcon={<CheckCircle2 className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
          <div className="space-y-6">
            <div className="rounded-2xl bg-stone-50/90 p-4 dark:bg-slate-900/50">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{latestQuiz.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {latestQuiz.instructions || "Select one answer for each question."}
              </p>
            </div>

            {latestQuiz.questions.map((question, index) => {
              const answerResult = latestAttempt?.answers.find((answer) => answer.questionId === question.id) ?? null;

              return (
                <div key={question.id} className="rounded-2xl border border-[color:var(--app-border)] p-4">
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

                  {resultsView && answerResult ? (
                    <div className="mt-4 rounded-xl bg-stone-50/90 p-3 text-sm dark:bg-slate-900/50">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        Your answer: {answerResult.submittedAnswer || "No answer"}
                      </p>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                        Correct answer: {question.answer}
                      </p>
                      {question.explanation ? (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">{question.explanation}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setAnswers(
                    latestQuiz.questions!.reduce<Record<string, string>>((acc, question) => {
                      acc[question.id] = "";
                      return acc;
                    }, {})
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Clear answers
              </button>

              <button
                type="button"
                onClick={() => submitAttemptMutation.mutateAsync(latestQuiz.id)}
                disabled={submitAttemptMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                {submitAttemptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit attempt
              </button>
            </div>

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
        </Card>
      )}
    </div>
  );
}
