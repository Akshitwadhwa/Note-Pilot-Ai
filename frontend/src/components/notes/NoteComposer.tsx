import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Save, Sparkles, BookOpen, Slash, FileStack, Brain } from "lucide-react";
import clsx from "clsx";

import type { GoogleClassroomMaterial, Note, TimetableEntry } from "../../types/domain";
import { formatSessionDate, getTodayLocalDateValue } from "../../utils/date";
import { Card } from "../common/Card";

type Props = {
  activeClass: TimetableEntry | null;
  notes: Note[];
  onCreateNote: (payload: { timetableId: string; sessionDate: string; content: string }) => Promise<void>;
  onSummarize: (noteId: string) => Promise<void>;
  enableSlashCommands?: boolean;
  classroomMaterials?: GoogleClassroomMaterial[];
  onAssistText?: (payload: { text: string; question: string }) => Promise<{ answer: string }>;
  onAskMaterial?: (payload: { materialId: string; question: string }) => Promise<{ answer: string }>;
  onSummarizeMaterial?: (materialId: string) => Promise<{ summary: string }>;
};

type SlashCommand = "ask-ai" | "material";

function getTrailingSlashTrigger(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").trimEnd();
  const match = normalized.match(/(?:^|\s)(\/[^\s]*)$/);
  return match?.[1] ?? null;
}

function getFilteredCommands(trigger: string | null) {
  const normalized = (trigger ?? "/").toLowerCase();

  return [
    {
      id: "ask-ai" as const,
      label: "/ask ai",
      description: "Ask AI about the note you are writing.",
      icon: Brain,
      iconClassName: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
    },
    {
      id: "material" as const,
      label: "/material",
      description: "Open classroom materials from this class.",
      icon: FileStack,
      iconClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
    }
  ].filter((command) => {
    if (normalized === "/") {
      return true;
    }

    const searchable = `${command.label} ${command.description}`.toLowerCase();
    return searchable.includes(normalized.slice(1));
  });
}

export function NoteComposer({
  activeClass,
  notes,
  onCreateNote,
  onSummarize,
  enableSlashCommands = false,
  classroomMaterials = [],
  onAssistText,
  onAskMaterial,
  onSummarizeMaterial
}: Props) {
  const [content, setContent] = useState("");
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [question, setQuestion] = useState("");
  const [commandAnswer, setCommandAnswer] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);
  const slashTrigger = useMemo(() => getTrailingSlashTrigger(content), [content]);
  const filteredCommands = useMemo(() => getFilteredCommands(slashTrigger), [slashTrigger]);
  const todaySessionDate = getTodayLocalDateValue();

  useEffect(() => {
    setContent("");
    setShowCommandMenu(false);
    setActiveCommand(null);
    setQuestion("");
    setCommandAnswer("");
    setSelectedMaterialId("");
  }, [activeClass?.id]);

  const selectedMaterial = useMemo(
    () => classroomMaterials.find((material) => material.id === selectedMaterialId) ?? null,
    [classroomMaterials, selectedMaterialId]
  );
  const todayNote = useMemo(
    () => notes.find((note) => note.sessionDate === todaySessionDate) ?? null,
    [notes, todaySessionDate]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClass || !content.trim()) {
      return;
    }
    await onCreateNote({
      timetableId: activeClass.id,
      sessionDate: todaySessionDate,
      content: content.trim()
    });
    setContent("");
  }

  function handleContentChange(nextValue: string) {
    setContent(nextValue);

    if (!enableSlashCommands) {
      return;
    }

    setShowCommandMenu(Boolean(getTrailingSlashTrigger(nextValue)));
  }

  function handleCommandSelect(command: SlashCommand) {
    setContent((current) => current.replace(/(?:^|\s)\/[^\s]*$/, ""));
    setShowCommandMenu(false);
    setActiveCommand(command);
    setQuestion("");
    setCommandAnswer("");

    if (command === "material" && classroomMaterials.length > 0) {
      setSelectedMaterialId(classroomMaterials[0]!.id);
    }
  }

  async function handleAskAI() {
    if (!onAssistText || !question.trim()) {
      return;
    }

    const sourceText = content.trim()
      ? content.trim()
      : `Current class: ${activeClass?.subjectName ?? "Unknown class"}`;

    setCommandLoading(true);
    try {
      const result = await onAssistText({ text: sourceText, question: question.trim() });
      setCommandAnswer(result.answer);
    } finally {
      setCommandLoading(false);
    }
  }

  async function handleAskMaterial() {
    if (!onAskMaterial || !selectedMaterialId || !question.trim()) {
      return;
    }

    setCommandLoading(true);
    try {
      const result = await onAskMaterial({ materialId: selectedMaterialId, question: question.trim() });
      setCommandAnswer(result.answer);
    } finally {
      setCommandLoading(false);
    }
  }

  async function handleSummarizeMaterial() {
    if (!onSummarizeMaterial || !selectedMaterialId) {
      return;
    }

    setCommandLoading(true);
    try {
      const result = await onSummarizeMaterial(selectedMaterialId);
      setCommandAnswer(result.summary);
    } finally {
      setCommandLoading(false);
    }
  }

  return (
    <Card
      title="Class Notes"
      titleIcon={<FileText className="h-5 w-5 text-teal-700 dark:text-teal-300" />}
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
            <div className="relative">
              <textarea
                value={content}
                onChange={(event) => handleContentChange(event.target.value)}
                rows={5}
                placeholder={`Write notes for ${activeClass.subjectName}...${enableSlashCommands ? " Type / anywhere for commands." : ""}`}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/85 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-stone-400 transition-all duration-200 focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:ring-teal-400/15"
              />

              {showCommandMenu && enableSlashCommands && filteredCommands.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {filteredCommands.map((command) => {
                    const Icon = command.icon;

                    return (
                      <button
                        key={command.id}
                        type="button"
                        onClick={() => handleCommandSelect(command.id)}
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-100 dark:hover:bg-slate-800"
                      >
                        <div className={clsx("rounded-lg p-2", command.iconClassName)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {command.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {command.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {enableSlashCommands && activeCommand === "ask-ai" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Slash className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                  /ask ai
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Ask about the note draft you are currently writing.
                </p>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={
                    content.trim()
                      ? "Ask AI about this note..."
                      : `Ask AI to draft notes for ${activeClass.subjectName}...`
                  }
                  className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <div className="mt-3 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveCommand(null)}
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAskAI()}
                    disabled={!question.trim() || commandLoading}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                  >
                    {commandLoading ? "Thinking..." : "Ask AI"}
                  </button>
                </div>
                {commandAnswer && (
                  <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <p className="whitespace-pre-wrap leading-7">{commandAnswer}</p>
                  </div>
                )}
              </div>
            )}

            {enableSlashCommands && activeCommand === "material" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Slash className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  /material
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Classroom materials matched to this class.
                </p>

                {classroomMaterials.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No Classroom materials were found for this class yet.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {classroomMaterials.map((material) => {
                        const isSelected = selectedMaterialId === material.id;
                        const attachmentLabel = material.attachments[0]?.title || material.attachments[0]?.mimeType || "No attachment label";

                        return (
                          <button
                            key={material.id}
                            type="button"
                            onClick={() => setSelectedMaterialId(material.id)}
                            className={clsx(
                              "w-full rounded-2xl border p-3 text-left transition-colors",
                              isSelected
                                ? "border-amber-300 bg-white shadow-sm dark:border-amber-700 dark:bg-slate-950"
                                : "border-stone-200 bg-white/70 hover:border-stone-300 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-slate-600"
                            )}
                          >
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{material.title}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {attachmentLabel}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {selectedMaterial && (
                      <div className="mt-4 space-y-3">
                        <input
                          value={question}
                          onChange={(event) => setQuestion(event.target.value)}
                          placeholder={`Ask about ${selectedMaterial.title}...`}
                          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-stone-400 focus:border-teal-700/40 focus:outline-none focus:ring-2 focus:ring-teal-700/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSummarizeMaterial()}
                            disabled={!selectedMaterialId || commandLoading}
                            className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {commandLoading ? "Working..." : "Summarize Material"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAskMaterial()}
                            disabled={!selectedMaterialId || !question.trim() || commandLoading}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
                          >
                            {commandLoading ? "Thinking..." : "Ask About Material"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCommand(null)}
                            className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Close
                          </button>
                        </div>
                        {commandAnswer && (
                          <div className="rounded-2xl bg-white p-4 text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                            <p className="whitespace-pre-wrap leading-7">{commandAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.98] dark:bg-teal-700 dark:text-white dark:hover:bg-teal-600"
            >
              <Save className="h-4 w-4" />
              {todayNote ? `Update ${formatSessionDate(todaySessionDate)} Note` : `Save ${formatSessionDate(todaySessionDate)} Note`}
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
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {formatSessionDate(note.sessionDate)}
                    </span>
                    <span>{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-300">
                    {note.content}
                  </p>
                  {note.summary ? (
                    <div className="mt-3 flex gap-2 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/50">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-emerald-900 dark:text-emerald-200">
                        {note.summary}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onSummarize(note.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Create Summary
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
