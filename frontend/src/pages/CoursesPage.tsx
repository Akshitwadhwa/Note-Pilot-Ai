import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Zap
} from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createCourse, listCourses } from "../features/courses/api";
import type { Course } from "../types/domain";

type CoverStyle = {
  bannerClass: string;
  codeClass: string;
};

type CourseViewMode = "recent" | "all" | "term";

const COVER_STYLES: CoverStyle[] = [
  {
    bannerClass:
      "bg-[radial-gradient(circle_at_6%_10%,#1f4d38_0%,#1f4d38_7%,transparent_8%),radial-gradient(circle_at_96%_10%,#dadbdd_0%,#dadbdd_12%,transparent_13%),linear-gradient(165deg,#f2f3f4,#d7dce1)]",
    codeClass: "text-slate-700"
  },
  {
    bannerClass:
      "bg-[radial-gradient(circle_at_88%_17%,#c25375_0%,#c25375_6%,transparent_7%),radial-gradient(circle_at_73%_34%,#2f5f44_0%,#2f5f44_7%,transparent_8%),radial-gradient(circle_at_36%_59%,#2f5f44_0%,#2f5f44_6%,transparent_7%),linear-gradient(165deg,#f1f0ee,#e6e2df)]",
    codeClass: "text-slate-700"
  },
  {
    bannerClass:
      "bg-[radial-gradient(circle_at_12%_10%,#cb2525_0%,#cb2525_4%,transparent_5%),radial-gradient(circle_at_84%_16%,#cb2525_0%,#cb2525_4%,transparent_5%),linear-gradient(160deg,#f4f5f7,#dcdee3)]",
    codeClass: "text-red-700"
  }
];

function normalizeForHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickCover(name: string): CoverStyle {
  return COVER_STYLES[normalizeForHash(name) % COVER_STYLES.length];
}

function makeCourseCode(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);

  if (initials.length >= 2) return initials;
  return name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "COURSE";
}

function getTermLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 1 && month <= 4) return `${year} Spring`;
  if (month >= 5 && month <= 7) return `${year} Summer`;
  if (month >= 8 && month <= 11) return `${year} Fall`;
  return `${year} Winter`;
}

function getTermSortValue(termLabel: string): number {
  const [yearPart, seasonPart = "Winter"] = termLabel.split(" ");
  const year = Number.parseInt(yearPart, 10);
  const seasonWeight =
    {
      Spring: 1,
      Summer: 2,
      Fall: 3,
      Winter: 4
    }[seasonPart] ?? 0;

  return (Number.isFinite(year) ? year : 0) * 10 + seasonWeight;
}

function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byDate !== 0) return byDate;
    return a.name.localeCompare(b.name);
  });
}

export function CoursesPage() {
  const { userId, userReady } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<CourseViewMode>("recent");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["courses", userId],
    queryFn: listCourses,
    enabled: userReady,
    retry: false
  });

  const createCourseMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["courses", userId] });
      setShowComposer(false);
      setNewCourseName("");
      addToast("Course created", "success");
    },
    onError: (error) => {
      addToast((error as Error).message || "Failed to create course", "error");
    }
  });

  const courses = useMemo(() => sortCourses(coursesQuery.data ?? []), [coursesQuery.data]);

  const termOptions = useMemo(() => {
    const terms = new Set<string>();
    for (const course of courses) {
      terms.add(getTermLabel(course.createdAt));
    }
    return Array.from(terms).sort((left, right) => getTermSortValue(right) - getTermSortValue(left));
  }, [courses]);

  const recentTerm = termOptions[0] ?? null;
  const explicitTermOptions = recentTerm ? termOptions.filter((term) => term !== recentTerm) : termOptions;
  const activeTerm =
    viewMode === "all"
      ? "All courses"
      : viewMode === "term"
        ? selectedTerm ?? recentTerm ?? "All courses"
        : recentTerm ?? "All courses";

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        makeCourseCode(course.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.handoutNames ?? []).some((handoutName) =>
          handoutName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesTerm = activeTerm === "All courses" || getTermLabel(course.createdAt) === activeTerm;
      return matchesSearch && matchesTerm;
    });
  }, [activeTerm, courses, searchQuery]);

  function handleCreateCourse() {
    const trimmedName = newCourseName.trim();
    if (!trimmedName) {
      addToast("Course name is required", "error");
      return;
    }

    void createCourseMutation.mutateAsync({ name: trimmedName });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100 dark:text-slate-100 text-slate-900">
          Courses
        </h1>
      </div>

      <section className="rounded-3xl border border-slate-800/70 bg-[#121417] p-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.9)] dark:border-slate-800 dark:bg-[#121417]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setViewMode("recent");
                setSelectedTerm(null);
              }}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-lg font-semibold transition-colors",
                viewMode === "recent"
                  ? "bg-white/12 text-white"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              )}
            >
              <Sparkles className="h-4 w-4" />
              {recentTerm ? `Recent semester · ${recentTerm}` : "Recent semester"}
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("all");
                setSelectedTerm(null);
              }}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-lg font-semibold transition-colors",
                viewMode === "all"
                  ? "bg-white/12 text-white"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              )}
            >
              <Zap className="h-4 w-4" />
              All courses
            </button>

            {explicitTermOptions.map((term) => {
              const isActive = viewMode === "term" && term === activeTerm;
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setViewMode("term");
                    setSelectedTerm(term);
                  }}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-lg font-semibold transition-colors",
                    isActive
                      ? "bg-white/12 text-white"
                      : "text-slate-300 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  {term}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sort"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowComposer((current) => !current)}
              className="ml-1 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-base font-semibold text-white transition-colors hover:bg-blue-500"
            >
              New
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search courses"
              className="w-full rounded-xl border border-slate-700 bg-[#191c20] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        {showComposer && (
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-700 bg-[#191c20] p-3 sm:grid-cols-[1fr_auto]">
            <input
              value={newCourseName}
              onChange={(event) => setNewCourseName(event.target.value)}
              placeholder="Enter course name, e.g. Calculus I"
              className="w-full rounded-lg border border-slate-600 bg-[#121417] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreateCourse}
              disabled={createCourseMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {createCourseMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        )}
      </section>

      {courses.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <p>
            {viewMode === "all"
              ? "Showing all semesters"
              : viewMode === "recent"
                ? `Showing recent semester courses${recentTerm ? ` · ${recentTerm}` : ""}`
                : `Showing ${activeTerm} courses`}
          </p>
          <p>{filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"}</p>
        </div>
      )}

      {coursesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-[300px] w-full rounded-3xl" />
          <div className="skeleton h-[300px] w-full rounded-3xl" />
        </div>
      ) : coursesQuery.isError ? (
        <div className="rounded-2xl border border-rose-800/70 bg-rose-950/30 p-4 text-sm text-rose-200">
          {(coursesQuery.error as Error).message || "Could not load courses."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredCourses.map((course) => {
            const cover = pickCover(course.name);
            const termLabel = getTermLabel(course.createdAt);
            const [yearLabel, seasonLabel = "Term"] = termLabel.split(" ");
            const courseCode = makeCourseCode(course.name);

            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-800 bg-[#1c1e22] transition-all hover:-translate-y-0.5 hover:border-slate-600"
              >
                <div className={clsx("flex h-48 items-center justify-center px-5", cover.bannerClass)}>
                  <p className={clsx("text-5xl font-bold tracking-wide", cover.codeClass)}>{courseCode}</p>
                </div>

                <div className="space-y-3 bg-[#202328] p-4">
                  <p className="line-clamp-2 text-[32px] font-semibold leading-tight text-slate-100">{course.name}</p>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-slate-200">
                      {yearLabel}
                    </span>
                    <span className="rounded-md bg-amber-700/80 px-2 py-0.5 font-semibold text-amber-100">
                      {seasonLabel}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-300">
                    <p>
                      {course.documentCount && course.documentCount > 0
                        ? `${course.documentCount} handout${course.documentCount === 1 ? "" : "s"}`
                        : "No handouts uploaded yet"}
                    </p>
                    {course.latestHandoutName ? (
                      <p className="line-clamp-1 text-slate-400">Latest handout: {course.latestHandoutName}</p>
                    ) : (
                      <p className="line-clamp-1 text-slate-500">Upload handouts to enrich this course.</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="flex h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#121417] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            <Plus className="h-7 w-7" />
            <span className="mt-2 text-2xl font-medium">New page</span>
          </button>
        </div>
      )}

      {!coursesQuery.isLoading && filteredCourses.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#121417] p-6 text-center text-slate-300">
          No courses match your filters.
        </div>
      )}
    </div>
  );
}
