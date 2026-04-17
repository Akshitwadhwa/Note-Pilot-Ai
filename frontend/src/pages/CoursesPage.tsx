import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, Clock, GraduationCap, Search } from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { listCourses } from "../features/courses/api";
import { listTimetableEntries } from "../features/timetable/api";
import { DAYS_OF_WEEK, type DayOfWeek, type TimetableEntry } from "../types/domain";

type CoverStyleId = "teal" | "rose" | "amber" | "slate";

type CourseCardData = {
  id: string;
  subjectName: string;
  courseCode: string;
  weeklyClasses: number;
  days: DayOfWeek[];
  firstStart: string;
  lastEnd: string;
  slots: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }>;
  coverStyle: CoverStyleId;
};

type CourseCover = {
  id: CoverStyleId;
  bannerClass: string;
  badgeClass: string;
};

const COURSE_COVERS: CourseCover[] = [
  {
    id: "teal",
    bannerClass:
      "bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.28),transparent_42%),linear-gradient(130deg,#0f766e,#164e63)]",
    badgeClass: "bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
  },
  {
    id: "rose",
    bannerClass:
      "bg-[radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.3),transparent_35%),linear-gradient(130deg,#be185d,#7e22ce)]",
    badgeClass: "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100"
  },
  {
    id: "amber",
    bannerClass:
      "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.35),transparent_40%),linear-gradient(130deg,#b45309,#7c2d12)]",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
  },
  {
    id: "slate",
    bannerClass:
      "bg-[radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.24),transparent_40%),linear-gradient(130deg,#1e293b,#0f172a)]",
    badgeClass: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
  }
];

function formatDay(day: DayOfWeek): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function pickCoverStyle(subjectName: string): CoverStyleId {
  let hash = 0;
  for (let i = 0; i < subjectName.length; i += 1) {
    hash = (hash << 5) - hash + subjectName.charCodeAt(i);
    hash |= 0;
  }
  const styles: CoverStyleId[] = ["teal", "rose", "amber", "slate"];
  return styles[Math.abs(hash) % styles.length];
}

function makeCourseCode(subjectName: string): string {
  const initials = subjectName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);

  if (initials.length >= 2) {
    return initials;
  }

  return subjectName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "COURSE";
}

function findCover(coverStyle: CoverStyleId): CourseCover {
  return COURSE_COVERS.find((cover) => cover.id === coverStyle) ?? COURSE_COVERS[0];
}

export function CoursesPage() {
  const { userId, userReady } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<"ALL" | DayOfWeek>("ALL");

  const coursesQuery = useQuery({
    queryKey: ["courses", userId],
    queryFn: listCourses,
    enabled: userReady
  });

  const timetableQuery = useQuery({
    queryKey: ["timetable", userId],
    queryFn: listTimetableEntries,
    enabled: userReady
  });

  const courses = useMemo<CourseCardData[]>(() => {
    const entries = timetableQuery.data ?? [];
    const courseEntities = coursesQuery.data ?? [];

    const groupedByName = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      const key = entry.subjectName.trim().toLowerCase().replace(/\s+/g, " ");
      const existing = groupedByName.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        groupedByName.set(key, [entry]);
      }
    }

    return courseEntities
      .map((course): CourseCardData => {
        const groupedEntries = groupedByName.get(course.normalizedName) ?? [];
        const subjectName = course.name;
        const daySet = new Set<DayOfWeek>();

        const slots = groupedEntries
          .map((entry) => {
            daySet.add(entry.dayOfWeek);
            return {
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime
            };
          })
          .sort((a, b) => {
            const dayDelta = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
            if (dayDelta !== 0) return dayDelta;
            return a.startTime.localeCompare(b.startTime);
          });

        const days = DAYS_OF_WEEK.filter((day) => daySet.has(day));

        return {
          id: course.id,
          subjectName,
          courseCode: makeCourseCode(subjectName),
          weeklyClasses: groupedEntries.length,
          days,
          firstStart: slots[0]?.startTime ?? "--:--",
          lastEnd: slots[slots.length - 1]?.endTime ?? "--:--",
          slots,
          coverStyle: pickCoverStyle(subjectName)
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [coursesQuery.data, timetableQuery.data]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDay = selectedDay === "ALL" || course.days.includes(selectedDay);
      return matchesSearch && matchesDay;
    });
  }, [courses, searchQuery, selectedDay]);

  return (
    <div className="mx-auto max-w-5xl space-y-7 stagger-children">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-[0_20px_36px_-28px_rgba(15,23,42,0.9)] dark:bg-indigo-900">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Courses</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Auto-generated from your timetable subjects.
              </p>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-stone-200/75 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <BookOpen className="h-3.5 w-3.5" />
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </div>
      </div>

      <section className="rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-shadow)] dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
        <div className="mb-4 rounded-2xl border border-[color:var(--app-border)] bg-white/65 px-4 py-3 text-xs text-slate-600 dark:border-[color:var(--app-border)] dark:bg-slate-900/60 dark:text-slate-300">
          Courses are stored in the backend and synced from timetable using subject names.
          <Link
            to="/timetable"
            className="ml-1 font-semibold text-teal-700 hover:underline dark:text-teal-300"
          >
            Add or edit classes in Timetable
          </Link>
          and this list will update automatically.
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by subject or code"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40"
            />
          </label>

          <select
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value as "ALL" | DayOfWeek)}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-slate-700 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All days</option>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {formatDay(day)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {coursesQuery.isLoading || timetableQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-64 w-full rounded-3xl" />
          <div className="skeleton h-64 w-full rounded-3xl" />
        </div>
      ) : coursesQuery.isError || timetableQuery.isError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/90 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {(coursesQuery.error as Error | null)?.message ||
            (timetableQuery.error as Error | null)?.message ||
            "Could not load courses right now."}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-stone-300 p-10 text-center dark:border-slate-700">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No courses found</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add classes in Timetable to populate this section automatically.
          </p>
          <Link
            to="/timetable"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            <CalendarDays className="h-4 w-4" />
            Go to Timetable
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredCourses.map((course) => {
            const cover = findCover(course.coverStyle);

            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="block"
              >
                <article className="overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] shadow-[var(--app-shadow)] transition-all hover:-translate-y-0.5 dark:border-[color:var(--app-border)] dark:bg-[color:var(--app-surface)]">
                  <div className={clsx("relative h-36 px-5 pt-5 text-white", cover.bannerClass)}>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/80">Course</p>
                    <p className="mt-6 text-3xl font-bold tracking-wide">{course.courseCode}</p>
                  </div>

                  <div className="space-y-4 p-5">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {course.subjectName}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={clsx("rounded-full px-2.5 py-1 font-semibold", cover.badgeClass)}>
                        {course.weeklyClasses} {course.weeklyClasses === 1 ? "class/week" : "classes/week"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5" />
                        {course.firstStart} - {course.lastEnd}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Weekly Slots
                      </p>
                      <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                        {course.slots.slice(0, 3).map((slot, index) => (
                          <div
                            key={`${course.id}-${slot.dayOfWeek}-${slot.startTime}-${index}`}
                            className="flex items-center justify-between rounded-xl bg-stone-100/80 px-3 py-1.5 dark:bg-slate-800/80"
                          >
                            <span className="font-medium">{formatDay(slot.dayOfWeek)}</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        ))}
                        {course.slots.length > 3 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            +{course.slots.length - 3} more slot{course.slots.length - 3 === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {course.days.map((day) => (
                          <span
                            key={`${course.id}-${day}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {formatDay(day)}
                          </span>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 dark:text-teal-300">
                        Open course
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
