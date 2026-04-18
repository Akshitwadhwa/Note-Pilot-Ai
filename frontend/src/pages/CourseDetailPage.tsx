import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookMarked,
  CalendarDays,
  CheckSquare2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  FolderKanban,
  Megaphone,
  Search
} from "lucide-react";
import clsx from "clsx";
import { Link, Navigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getCourseDetail } from "../features/courses/api";
import type { CourseNote, DayOfWeek, GoogleClassroomMaterial } from "../types/domain";

type NotesView = "all" | "review";

function formatDay(day: DayOfWeek): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildNoteTitle(note: CourseNote, index: number): string {
  const firstLine = note.content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return `Lecture Note ${index + 1}`;
  }

  return firstLine.length > 52 ? `${firstLine.slice(0, 52).trimEnd()}...` : firstLine;
}

function buildMaterialsLabel(note: CourseNote): string {
  if (!note.timetableEntry) {
    return "Course archive";
  }

  return `${formatDay(note.timetableEntry.dayOfWeek)} ${note.timetableEntry.startTime}-${note.timetableEntry.endTime}`;
}

function getReviewStorageKey(courseId: string) {
  return `course-note-review:${courseId}`;
}

function formatMaterialSource(sourceType: string) {
  if (sourceType === "announcement") return "Post";
  if (sourceType === "course_work") return "Assignment";
  if (sourceType === "course_material") return "Material";
  return sourceType.replace(/_/g, " ");
}

function getMaterialSortTimestamp(material: GoogleClassroomMaterial) {
  return new Date(material.publishedAt ?? material.createdAt).getTime();
}

function getMaterialSummary(material: GoogleClassroomMaterial) {
  const text = material.description?.trim() || material.analysis?.summary?.trim() || "";
  if (!text) {
    return "No preview available for this post yet.";
  }

  return text.length > 140 ? `${text.slice(0, 140).trimEnd()}...` : text;
}

function getMaterialDueLabel(material: GoogleClassroomMaterial) {
  if (material.sourceType !== "course_work") {
    return null;
  }

  const metadata = material.metadata as
    | {
        dueDate?: { year?: number; month?: number; day?: number } | null;
        dueTime?: { hours?: number; minutes?: number } | null;
      }
    | null
    | undefined;

  const dueDate = metadata?.dueDate;
  if (!dueDate?.year || !dueDate?.month || !dueDate?.day) {
    return "No due date";
  }

  const due = new Date(
    dueDate.year,
    Math.max((dueDate.month ?? 1) - 1, 0),
    dueDate.day,
    metadata?.dueTime?.hours ?? 0,
    metadata?.dueTime?.minutes ?? 0
  );

  if (Number.isNaN(due.getTime())) {
    return "No due date";
  }

  return `Due ${due.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { userReady } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<NotesView>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined" || !courseId) {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(getReviewStorageKey(courseId));
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const detailQuery = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: Boolean(courseId) && userReady
  });

  useEffect(() => {
    if (typeof window === "undefined" || !courseId) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(getReviewStorageKey(courseId));
      setReviewedMap(raw ? (JSON.parse(raw) as Record<string, boolean>) : {});
    } catch {
      setReviewedMap({});
    }
  }, [courseId]);

  const filteredNotes = useMemo(() => {
    const notes = detailQuery.data?.notes ?? [];

    return notes.filter((note, index) => {
      const reviewed = Boolean(reviewedMap[note.id]);
      const title = buildNoteTitle(note, index).toLowerCase();
      const content = note.content.toLowerCase();
      const materials = buildMaterialsLabel(note).toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        title.includes(searchQuery.toLowerCase()) ||
        content.includes(searchQuery.toLowerCase()) ||
        materials.includes(searchQuery.toLowerCase());

      const matchesView = view === "all" || !reviewed;
      return matchesSearch && matchesView;
    });
  }, [detailQuery.data?.notes, reviewedMap, searchQuery, view]);

  useEffect(() => {
    if (filteredNotes.length === 0) {
      setSelectedNoteId(null);
      return;
    }

    if (!selectedNoteId || !filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  if (!courseId) {
    return <Navigate to="/courses" replace />;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-14 w-44 rounded-2xl" />
        <div className="skeleton h-36 w-full rounded-3xl" />
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="skeleton h-[32rem] w-full rounded-3xl" />
          <div className="skeleton h-[32rem] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50/90 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        {(detailQuery.error as Error).message || "Could not load this course."}
      </div>
    );
  }

  const detail = detailQuery.data;
  if (!detail) {
    return <Navigate to="/courses" replace />;
  }

  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) ?? null;
  const reviewedCount = detail.notes.filter((note) => reviewedMap[note.id]).length;
  const totalNotes = detail.notes.length;
  const pendingCount = Math.max(totalNotes - reviewedCount, 0);
  const reviewProgress = totalNotes === 0 ? 0 : Math.round((reviewedCount / totalNotes) * 100);
  const sortedMaterials = [...detail.googleClassroomMaterials].sort(
    (a, b) => getMaterialSortTimestamp(b) - getMaterialSortTimestamp(a)
  );
  const recentPosts = sortedMaterials.slice(0, 5);
  const assignmentMaterials = sortedMaterials.filter((material) => material.sourceType === "course_work");
  const announcementMaterials = sortedMaterials.filter((material) => material.sourceType === "announcement");
  const materialResources = sortedMaterials.filter((material) => material.sourceType === "course_material");

  function toggleReviewed(noteId: string) {
    setReviewedMap((current) => {
      const next = { ...current, [noteId]: !current[noteId] };
      window.localStorage.setItem(getReviewStorageKey(courseId!), JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 stagger-children">
      <div className="space-y-4">
        <Link
          to="/courses"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-stone-200/80 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
          <div className="relative border-b border-[color:var(--app-border)] bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.28),transparent_30%),linear-gradient(135deg,#0f172a,#111827_50%,#0f766e)] px-6 py-8 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
                  <BookMarked className="h-3.5 w-3.5" />
                  Course Workspace
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{detail.course.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                  Review notes, inspect class slots, and browse synced Google Classroom materials for this subject.
                </p>
              </div>

              <div className="min-w-[14rem] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Review Progress
                </p>
                <p className="mt-2 text-3xl font-bold">{reviewProgress}%</p>
                <div className="mt-3 h-2 rounded-full bg-white/20">
                  <div
                    className="h-2 rounded-full bg-emerald-300 transition-all"
                    style={{ width: `${reviewProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-6 py-5 sm:grid-cols-3 xl:grid-cols-7">
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Notes
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {totalNotes}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Reviewed
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {reviewedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Pending
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Class Slots
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {detail.timetableEntries.length}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                GC Materials
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {detail.googleClassroomMaterials.length}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Assignments
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {assignmentMaterials.length}
              </p>
            </div>
            <div className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Recent Posts
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {announcementMaterials.length}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-5">
          <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
            <div className="mb-4 flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Course Feed</h2>
            </div>

            {detail.googleClassroomMaterials.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No synced Google Classroom materials match this course yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-stone-50/80 p-4 dark:bg-slate-900/45">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent posts</p>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {announcementMaterials.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Announcements synced from Google Classroom
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-stone-50/80 p-4 dark:bg-slate-900/45">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assignments</p>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {assignmentMaterials.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Coursework items attached to this course
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-stone-50/80 p-4 dark:bg-slate-900/45">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resources</p>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {materialResources.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Shared course materials and posts
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Recent Activity
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {recentPosts.length} most recent item{recentPosts.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {recentPosts.map((material) => (
                    <div
                      key={material.id}
                      className="rounded-2xl border border-[color:var(--app-border)] bg-stone-50/80 p-4 dark:bg-slate-900/45"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                material.sourceType === "course_work"
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
                                  : material.sourceType === "announcement"
                                    ? "bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
                                    : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                              )}
                            >
                              {formatMaterialSource(material.sourceType)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatTimestamp(material.publishedAt ?? material.createdAt)}
                            </span>
                          </div>
                          <Link
                            to={`/materials/${material.id}`}
                            className="mt-2 block text-base font-semibold text-slate-900 hover:text-teal-800 dark:text-slate-100 dark:hover:text-teal-200"
                          >
                            {material.title}
                          </Link>
                        </div>

                        {material.alternateLink ? (
                          <a
                            href={material.alternateLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                          >
                            Open
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        {getMaterialSummary(material)}
                      </p>

                      {material.sourceType === "course_work" && (
                        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {getMaterialDueLabel(material)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Course Notes</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div className="inline-flex rounded-2xl bg-stone-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setView("all")}
                    className={clsx(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                      view === "all"
                        ? "bg-slate-900 text-white dark:bg-teal-700"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    )}
                  >
                    All notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("review")}
                    className={clsx(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                      view === "review"
                        ? "bg-slate-900 text-white dark:bg-teal-700"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    )}
                  >
                    To review
                  </button>
                </div>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search notes or materials"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40"
                  />
                </label>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="mt-6 rounded-[24px] border-2 border-dashed border-stone-300 p-10 text-center dark:border-slate-700">
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  No notes match this view
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create notes from the Notes or Past Notes pages and they will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-700 bg-[#0f1115]">
                <div className="max-h-[30rem] overflow-y-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 border-b border-slate-700 bg-[#11141b]">
                      <tr className="text-sm font-semibold text-slate-300">
                        <th className="w-36 border-r border-slate-700 px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <CheckSquare2 className="h-4 w-4" />
                            Reviewed
                          </span>
                        </th>
                        <th className="border-r border-slate-700 px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-base font-bold text-slate-400">Aa</span>
                            Name
                          </span>
                        </th>
                        <th className="w-44 px-4 py-3">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNotes.map((note, index) => {
                        const reviewed = Boolean(reviewedMap[note.id]);
                        const isSelected = note.id === selectedNoteId;

                        return (
                          <tr
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={clsx(
                              "cursor-pointer border-b border-slate-700/80 transition-colors",
                              isSelected
                                ? "bg-blue-950/30"
                                : "bg-[#0f1115] hover:bg-slate-900/70"
                            )}
                          >
                            <td className="border-r border-slate-700 px-4 py-3 align-middle">
                              <label
                                className="inline-flex items-center"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={reviewed}
                                  onChange={() => toggleReviewed(note.id)}
                                  className="h-8 w-8 rounded-md border border-slate-500 bg-transparent text-blue-500 focus:ring-2 focus:ring-blue-500/40"
                                />
                              </label>
                            </td>

                            <td className="border-r border-slate-700 px-4 py-3 align-middle">
                              <div className="min-w-0">
                                <p className="truncate text-[22px] font-semibold leading-tight text-slate-100">
                                  {buildNoteTitle(note, index)}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {buildMaterialsLabel(note)} | {formatTimestamp(note.timestamp)}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className="inline-flex rounded-lg bg-fuchsia-300/65 px-3 py-1 text-sm font-semibold text-fuchsia-950">
                                Lecture
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Class Slots</h2>
            </div>

            {detail.timetableEntries.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No timetable slots are attached to this course yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {detail.timetableEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-stone-100/80 px-4 py-3 dark:bg-slate-800/75">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatDay(entry.dayOfWeek)}
                      </p>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {entry.startTime} - {entry.endTime}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.subjectName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
          <div className="mb-4 flex items-center gap-2">
            <CheckSquare2 className="h-5 w-5 text-teal-700 dark:text-teal-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Selected Note</h2>
          </div>

          {!selectedNote ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center dark:border-slate-700">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Select a note to read it</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Note content and AI summary will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-stone-100/80 p-4 dark:bg-slate-800/75">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {buildNoteTitle(
                        selectedNote,
                        detail.notes.findIndex((note) => note.id === selectedNote.id)
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {buildMaterialsLabel(selectedNote)}
                      </span>
                      <span>{formatTimestamp(selectedNote.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleReviewed(selectedNote.id)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      reviewedMap[selectedNote.id]
                        ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-100"
                    )}
                  >
                    {reviewedMap[selectedNote.id] ? "Mark pending" : "Mark reviewed"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/60">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Full Note
                </p>
                <div className="max-h-[18rem] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {selectedNote.content}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/60">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  AI Summary
                </p>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {selectedNote.summary || "No AI summary generated yet for this note."}
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
