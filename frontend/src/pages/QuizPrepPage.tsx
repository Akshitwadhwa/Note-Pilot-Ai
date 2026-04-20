import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Eye, FolderKanban, NotebookTabs, RotateCcw, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "../components/common/Card";
import { useAuth } from "../context/AuthContext";
import { listGoogleClassroomQuizPrep } from "../features/google-classroom/api";

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

export function QuizPrepPage() {
  const { userId, userReady } = useAuth();

  const quizPrepQuery = useQuery({
    queryKey: ["google-classroom-quiz-prep", userId],
    queryFn: listGoogleClassroomQuizPrep,
    enabled: userReady
  });

  const stats = useMemo(() => {
    const quizzes = quizPrepQuery.data ?? [];
    const attempted = quizzes.filter((quiz) => quiz.attemptCount > 0).length;
    const totalAttempts = quizzes.reduce((sum, quiz) => sum + quiz.attemptCount, 0);
    return {
      totalQuizzes: quizzes.length,
      attempted,
      totalAttempts
    };
  }, [quizPrepQuery.data]);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quiz Prep</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review generated quizzes, open the source material, and see your results in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5" interactive={false}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <NotebookTabs className="h-4 w-4" />
            Quizzes Created
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalQuizzes}</p>
        </Card>
        <Card className="p-5" interactive={false}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4" />
            Quizzes Attempted
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.attempted}</p>
        </Card>
        <Card className="p-5" interactive={false}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <Trophy className="h-4 w-4" />
            Total Attempts
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalAttempts}</p>
        </Card>
      </div>

      {quizPrepQuery.isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-40 w-full rounded-[28px]" />
          <div className="skeleton h-40 w-full rounded-[28px]" />
        </div>
      ) : quizPrepQuery.isError ? (
        <Card>
          <p className="text-sm text-rose-700 dark:text-rose-300">
            {(quizPrepQuery.error as Error).message || "Quiz prep could not be loaded."}
          </p>
        </Card>
      ) : (quizPrepQuery.data?.length ?? 0) === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <CircleDashed className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No generated quizzes yet</p>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Generate a quiz from any material first. Once created, it will appear here with your results.
            </p>
            <Link
              to="/materials"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600"
            >
              <FolderKanban className="h-4 w-4" />
              Open materials
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {quizPrepQuery.data!.map((quiz) => (
            <Card key={quiz.id} className="space-y-5" interactive={false}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {quiz.courseName ?? "Unknown subject"}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{quiz.title}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{quiz.materialTitle}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Created {formatTimestamp(quiz.createdAt)} • {quiz.totalQuestions} questions
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-stone-100 px-4 py-3 dark:bg-slate-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Latest Result
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {quiz.latestAttempt
                        ? formatScore(quiz.latestAttempt.score, quiz.latestAttempt.totalQuestions)
                        : "Not attempted"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-stone-100 px-4 py-3 dark:bg-slate-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Best Score
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {quiz.bestScore !== null
                        ? formatScore(quiz.bestScore, quiz.totalQuestions)
                        : "No attempts"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-stone-100 px-4 py-3 dark:bg-slate-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Attempts
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{quiz.attemptCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--app-border)] bg-stone-50/70 px-4 py-3 dark:bg-slate-900/40">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Source material</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Open the original material to review notes, quiz prep pack, or retake this quiz.
                  </p>
                </div>
                <Link
                  to={`/materials/${quiz.materialId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open material
                </Link>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Attempt History
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/materials/${quiz.materialId}/quiz`}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Attempt again
                    </Link>
                    <Link
                      to={`/materials/${quiz.materialId}/quiz?view=results`}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        quiz.attempts.length > 0
                          ? "border border-stone-200 text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          : "cursor-not-allowed border border-stone-200/70 text-slate-400 opacity-60 dark:border-slate-800 dark:text-slate-500 pointer-events-none"
                      }`}
                      aria-disabled={quiz.attempts.length === 0}
                    >
                      <Eye className="h-4 w-4" />
                      See results
                    </Link>
                  </div>
                </div>
                {quiz.attempts.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    This quiz has been generated but not attempted yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {quiz.attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatScore(attempt.score, attempt.totalQuestions)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Submitted {formatTimestamp(attempt.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
