import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Save, Sparkles, BookOpen } from "lucide-react";

import type { Note, TimetableEntry } from "../../types/domain";
import { Card } from "../common/Card";

type Props = {
  activeClass: TimetableEntry | null;
  notes: Note[];
  onCreateNote: (payload: { timetableId: string; content: string }) => Promise<void>;
  onSummarize: (noteId: string) => Promise<void>;
};

export function NoteComposer({ activeClass, notes, onCreateNote, onSummarize }: Props) {
  const [content, setContent] = useState("");

  useEffect(() => {
    setContent("");
  }, [activeClass?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClass || !content.trim()) {
      return;
    }
    await onCreateNote({ timetableId: activeClass.id, content: content.trim() });
    setContent("");
  }

  return (
    <Card
      title="Notes + AI Summary"
      titleIcon={<FileText className="h-5 w-5 text-sky-500" />}
    >
      {!activeClass ? (
        <div className="flex flex-col items-center py-8 text-center">
          <BookOpen className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-400">
            No active class selected
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            An active class is required to write notes. Check your timetable schedule.
          </p>
        </div>
      ) : (
        <>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder={`Write notes for ${activeClass.subjectName}...`}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-700 hover:shadow-md active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Save className="h-4 w-4" />
              Save Note
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Notes
            </h3>
            {notes.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <FileText className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No notes yet for this class
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                >
                  <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-300">
                    {note.content}
                  </p>
                  {note.summary ? (
                    <div className="mt-3 flex gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/50">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-emerald-900 dark:text-emerald-200">
                        {note.summary}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onSummarize(note.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Summary
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </>
      )}
    </Card>
  );
}
