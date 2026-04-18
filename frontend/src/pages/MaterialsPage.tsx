import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  FolderKanban,
  Link2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Card } from "../components/common/Card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getGoogleClassroomAuthUrl,
  getGoogleClassroomStatus,
  listGoogleClassroomMaterials,
  syncGoogleClassroom
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

export function MaterialsPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCourse, setSelectedCourse] = useState("All subjects");

  const statusQuery = useQuery({
    queryKey: ["google-classroom-status", userId],
    queryFn: getGoogleClassroomStatus,
    enabled: userReady
  });

  const materialsQuery = useQuery({
    queryKey: ["google-classroom-materials", userId],
    queryFn: listGoogleClassroomMaterials,
    enabled: userReady && Boolean(statusQuery.data?.connected)
  });

  const connectMutation = useMutation({
    mutationFn: getGoogleClassroomAuthUrl,
    onError: (error) => {
      addToast((error as Error).message || "Failed to start Google Classroom connection", "error");
    }
  });

  const syncMutation = useMutation({
    mutationFn: syncGoogleClassroom,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-classroom-status", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-materials", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-dashboard-summary", userId] }),
        queryClient.invalidateQueries({ queryKey: ["courses", userId] })
      ]);

      addToast(
        `Sync complete: ${result.inserted} new, ${result.updated} updated, ${result.materialsScanned} scanned.`,
        "success"
      );
    },
    onError: (error) => {
      addToast((error as Error).message || "Google Classroom sync failed", "error");
    }
  });

  useEffect(() => {
    const oauthStatus = searchParams.get("googleClassroom");
    if (!oauthStatus) {
      return;
    }

    const message = searchParams.get("message");
    if (oauthStatus === "connected") {
      addToast("Google Classroom connected", "success");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["google-classroom-status", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-materials", userId] }),
        queryClient.invalidateQueries({ queryKey: ["google-classroom-dashboard-summary", userId] })
      ]);
    } else {
      addToast(message || "Google Classroom connection failed", "error");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("googleClassroom");
    nextParams.delete("message");
    setSearchParams(nextParams, { replace: true });
  }, [addToast, queryClient, searchParams, setSearchParams, userId]);

  async function handleConnect() {
    const data = await connectMutation.mutateAsync();
    window.location.assign(data.url);
  }

  const isConnected = Boolean(statusQuery.data?.connected);
  const courseOptions = useMemo(() => {
    const options = new Set<string>();
    for (const material of materialsQuery.data ?? []) {
      const courseName = material.courseName?.trim();
      if (courseName) {
        options.add(courseName);
      }
    }
    return ["All subjects", ...Array.from(options).sort((a, b) => a.localeCompare(b))];
  }, [materialsQuery.data]);

  const filteredMaterials = useMemo(() => {
    const materials = materialsQuery.data ?? [];
    if (selectedCourse === "All subjects") {
      return materials;
    }

    return materials.filter((material) => (material.courseName ?? "").trim() === selectedCourse);
  }, [materialsQuery.data, selectedCourse]);

  useEffect(() => {
    if (!courseOptions.includes(selectedCourse)) {
      setSelectedCourse("All subjects");
    }
  }, [courseOptions, selectedCourse]);

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[32px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-[var(--app-shadow)]">
        <div className="border-b border-[color:var(--app-border)] bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.2),transparent_32%),linear-gradient(140deg,#0f172a,#0b3b39_58%,#16343a)] px-6 py-8 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                <FolderKanban className="h-3.5 w-3.5" />
                Classroom Materials
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Google Classroom in one place</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                Connect once, sync your uploaded class materials, then generate AI summaries and quizzes from each item.
              </p>
            </div>

            <div className="min-w-[17rem] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Connection Status
              </p>
              {statusQuery.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Google Classroom
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-bold">{isConnected ? "Connected" : "Not connected"}</p>
                  <p className="mt-1 text-sm text-white/75">
                    {statusQuery.data?.googleEmail ?? "Connect your Google account to import classroom materials."}
                  </p>
                  <p className="mt-3 text-xs text-white/65">
                    Last sync: {formatTimestamp(statusQuery.data?.lastSyncedAt)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_auto_auto]">
          <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Materials Loaded
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {materialsQuery.data?.length ?? 0}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={connectMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {isConnected ? "Reconnect Google Classroom" : "Connect Google Classroom"}
          </button>

          <button
            type="button"
            onClick={() => void syncMutation.mutateAsync()}
            disabled={!isConnected || syncMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Materials
          </button>
        </div>
      </section>

      {!isConnected && !statusQuery.isLoading ? (
        <Card title="Connect Google Classroom" titleIcon={<Link2 className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            This flow uses your current app login. After you connect your Google account, the backend stores the Classroom tokens for this signed-in user and syncs course announcements, course work, and course materials into the app database.
          </p>
        </Card>
      ) : null}

      {isConnected && courseOptions.length > 1 ? (
        <Card title="Filter By Subject" titleIcon={<BookOpenText className="h-5 w-5 text-teal-700 dark:text-teal-300" />}>
          <div className="flex flex-wrap gap-2">
            {courseOptions.map((courseName) => {
              const isActive = selectedCourse === courseName;
              return (
                <button
                  key={courseName}
                  type="button"
                  onClick={() => setSelectedCourse(courseName)}
                  className={
                    isActive
                      ? "rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-teal-700"
                      : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }
                >
                  {courseName}
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {materialsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-56 rounded-[28px]" />
          <div className="skeleton h-56 rounded-[28px]" />
        </div>
      ) : materialsQuery.isError ? (
        <Card>
          <p className="text-sm text-rose-700 dark:text-rose-300">
            {(materialsQuery.error as Error).message || "Could not load Google Classroom materials."}
          </p>
        </Card>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredMaterials.map((material) => (
            <Link
              key={material.id}
              to={`/materials/${material.id}`}
              className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] transition-all hover:-translate-y-0.5 hover:border-slate-400 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                    {formatSourceType(material.sourceType)}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {material.title}
                  </h2>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 text-slate-400" />
                  <span>{material.courseName ?? "Unknown course"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span>{formatTimestamp(material.publishedAt ?? material.createdAt)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {material.attachments.length} attachment{material.attachments.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {material.analysis ? "AI ready" : "Needs analysis"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : isConnected ? (
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {selectedCourse === "All subjects"
              ? "No materials have been synced yet. Use Sync Materials after connecting Google Classroom."
              : `No synced materials matched the subject "${selectedCourse}".`}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
