import OpenAI from "openai";
import { and, asc, desc, eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../lib/db";
import { courseDocumentChunks, courseDocuments, courses } from "../lib/drizzle/schema";
import { AppError } from "../middleware/error.middleware";

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
const huggingFaceClient = env.huggingFaceApiKey
  ? new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: env.huggingFaceApiKey
    })
  : null;

type SyllabusExtraction = {
  syllabusSummary: string | null;
  credits: string | null;
  evaluationCriteria: string | null;
};

type QuizPrepSource = {
  label: string;
  kind: "handout" | "classroom_material";
  excerpt: string;
};

type QuizPrepSection = {
  heading: string;
  content: string;
};

type QuizPrepQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string | null;
};

export type QuizPrepPack = {
  topic: string;
  noteTitle: string;
  noteSections: QuizPrepSection[];
  practiceQuestions: QuizPrepQuestion[];
  sources: QuizPrepSource[];
};

type SupplementalContext = {
  label: string;
  content: string;
};

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
}

function normalizeCourseName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function ensureOpenAI() {
  if (!openai) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }
  return openai;
}

function ensureHuggingFace() {
  if (!huggingFaceClient) {
    throw new AppError("HUGGINGFACE_API_KEY is not configured", 500);
  }

  if (!env.huggingFaceExtractionModel.trim()) {
    throw new AppError("HUGGINGFACE_EXTRACTION_MODEL is not configured", 500);
  }

  return huggingFaceClient;
}

async function parsePdfBuffer(buffer: Buffer) {
  try {
    const pdfParseModule = require("pdf-parse") as (input: Buffer) => Promise<{ text: string }>;
    return await pdfParseModule(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF parser error";
    throw new AppError(
      `PDF uploads are temporarily unavailable in this environment (${message}). Upload TXT/MD instead, or install the missing PDF runtime dependency.`,
      500
    );
  }
}

async function ensureCourseOwnership(userId: string, courseId: string) {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, userId))
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return course;
}

async function extractTextFromUpload(file: Express.Multer.File) {
  if (file.mimetype === "application/pdf") {
    const parsed = await parsePdfBuffer(file.buffer);
    return parsed.text.trim();
  }

  if (
    file.mimetype.startsWith("text/") ||
    file.originalname.endsWith(".md") ||
    file.originalname.endsWith(".txt")
  ) {
    return file.buffer.toString("utf-8").trim();
  }

  throw new AppError("Unsupported file type. Upload PDF, TXT, or MD files.", 415);
}

function chunkText(text: string, chunkSize = 1400, overlap = 200) {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize);
    chunks.push(cleaned.slice(start, end).trim());
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

async function embedTexts(texts: string[]) {
  if (texts.length === 0) return [];
  const client = ensureOpenAI();
  const response = await client.embeddings.create({
    model: env.openaiEmbeddingModel,
    input: texts
  });
  return response.data.map((item) => item.embedding);
}

async function extractSyllabusFields(text: string): Promise<SyllabusExtraction> {
  const excerpt = text.slice(0, 14000);
  const systemPrompt =
    "Extract syllabus information from course handouts. Return JSON with keys syllabusSummary, credits, evaluationCriteria. Use null when a value is not present. Return only valid JSON.";
  const userPrompt = `Extract structured syllabus details from this handout text:\n\n${excerpt}`;

  const response =
    env.ragExtractionProvider === "huggingface"
      ? await ensureHuggingFace().chat.completions.create({
          model: env.huggingFaceExtractionModel,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        })
      : await ensureOpenAI().chat.completions.create({
          model: env.openaiModel,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    return {
      syllabusSummary: null,
      credits: null,
      evaluationCriteria: null
    };
  }

  try {
    const parsed = JSON.parse(extractJsonPayload(raw)) as Partial<SyllabusExtraction>;
    return {
      syllabusSummary:
        typeof parsed.syllabusSummary === "string" && parsed.syllabusSummary.trim()
          ? parsed.syllabusSummary.trim()
          : null,
      credits:
        typeof parsed.credits === "string" && parsed.credits.trim() ? parsed.credits.trim() : null,
      evaluationCriteria:
        typeof parsed.evaluationCriteria === "string" && parsed.evaluationCriteria.trim()
          ? parsed.evaluationCriteria.trim()
          : null
    };
  } catch {
    return {
      syllabusSummary: null,
      credits: null,
      evaluationCriteria: null
    };
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function listCourseDocuments(userId: string, courseId: string) {
  await ensureCourseOwnership(userId, courseId);

  return db.query.courseDocuments.findMany({
    where: and(eq(courseDocuments.userId, userId), eq(courseDocuments.courseId, courseId)),
    orderBy: desc(courseDocuments.createdAt)
  });
}

export async function uploadCourseDocument(userId: string, courseId: string, file: Express.Multer.File) {
  await ensureCourseOwnership(userId, courseId);

  if (!file) {
    throw new AppError("A handout file is required", 422);
  }

  const extractedText = await extractTextFromUpload(file);
  if (!extractedText) {
    throw new AppError("Could not extract readable text from this file", 422);
  }

  const [syllabusFields, chunks] = await Promise.all([
    extractSyllabusFields(extractedText),
    Promise.resolve(chunkText(extractedText))
  ]);

  const embeddings = await embedTexts(chunks);

  const insertedDocument = (
    await db
      .insert(courseDocuments)
      .values({
        id: crypto.randomUUID(),
        courseId,
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        byteSize: file.size,
        extractedText,
        syllabusSummary: syllabusFields.syllabusSummary,
        credits: syllabusFields.credits,
        evaluationCriteria: syllabusFields.evaluationCriteria,
        metadata: {
          chunkCount: chunks.length
        }
      })
      .returning()
  )[0];

  if (chunks.length > 0) {
    await db.insert(courseDocumentChunks).values(
      chunks.map((content, index) => ({
        id: crypto.randomUUID(),
        documentId: insertedDocument.id,
        courseId,
        userId,
        chunkIndex: index,
        content,
        embedding: embeddings[index] ?? []
      }))
    );
  }

  return insertedDocument;
}

export async function askCourseQuestion(userId: string, courseId: string, question: string) {
  const course = await ensureCourseOwnership(userId, courseId);
  const client = ensureOpenAI();

  const query = question.trim();
  if (!query) {
    throw new AppError("Question is required", 422);
  }

  const chunks = await db.query.courseDocumentChunks.findMany({
    where: and(eq(courseDocumentChunks.userId, userId), eq(courseDocumentChunks.courseId, courseId)),
    orderBy: [asc(courseDocumentChunks.createdAt), asc(courseDocumentChunks.chunkIndex)]
  });

  if (chunks.length === 0) {
    throw new AppError("Upload a course handout before asking questions", 422);
  }

  const [queryEmbedding] = await embedTexts([query]);

  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity((chunk.embedding as number[]) ?? [], queryEmbedding ?? [])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const documents = await db.query.courseDocuments.findMany({
    where: and(eq(courseDocuments.userId, userId), eq(courseDocuments.courseId, courseId)),
    orderBy: desc(courseDocuments.createdAt)
  });
  const documentById = new Map(documents.map((document) => [document.id, document]));

  const context = ranked
    .map(({ chunk }, index) => {
      const document = documentById.get(chunk.documentId);
      return `Source ${index + 1} (${document?.fileName ?? "handout"}):\n${chunk.content}`;
    })
    .join("\n\n");

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Answer questions about a course using only the provided source context. If the answer is not in the context, say that clearly."
      },
      {
        role: "user",
        content: `Course: ${course.name}\n\nQuestion: ${query}\n\nContext:\n${context}`
      }
    ]
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new AppError("Model returned an empty answer", 502);
  }

  return {
    answer,
    sources: ranked.map(({ chunk, score }) => {
      const document = documentById.get(chunk.documentId);
      return {
        documentId: chunk.documentId,
        fileName: document?.fileName ?? "handout",
        chunkIndex: chunk.chunkIndex,
        score,
        excerpt: chunk.content.slice(0, 240)
      };
    })
  };
}

export async function buildQuizPrepPack(
  userId: string,
  courseName: string,
  studyGoal: string,
  supplementalContext: SupplementalContext[] = []
): Promise<QuizPrepPack> {
  const client = ensureOpenAI();
  const normalizedCourseName = normalizeCourseName(courseName);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.userId, userId), eq(courses.normalizedName, normalizedCourseName))
  });

  const chunks =
    course
      ? await db.query.courseDocumentChunks.findMany({
          where: and(eq(courseDocumentChunks.userId, userId), eq(courseDocumentChunks.courseId, course.id)),
          orderBy: [asc(courseDocumentChunks.createdAt), asc(courseDocumentChunks.chunkIndex)]
        })
      : [];

  const documents =
    course
      ? await db.query.courseDocuments.findMany({
          where: and(eq(courseDocuments.userId, userId), eq(courseDocuments.courseId, course.id)),
          orderBy: desc(courseDocuments.createdAt)
        })
      : [];

  const documentById = new Map(documents.map((document) => [document.id, document]));

  const rankedChunks =
    chunks.length > 0
      ? (() => {
          return chunks;
        })()
      : [];

  const [queryEmbedding] = chunks.length > 0 ? await embedTexts([studyGoal]) : [[]];
  const relevantChunks =
    rankedChunks.length > 0
      ? rankedChunks
          .map((chunk) => ({
            chunk,
            score: cosineSimilarity((chunk.embedding as number[]) ?? [], (queryEmbedding as number[]) ?? [])
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
      : [];

  const courseContext = relevantChunks
    .map(({ chunk }, index) => {
      const document = documentById.get(chunk.documentId);
      return `Handout Source ${index + 1} (${document?.fileName ?? "course handout"}):\n${chunk.content}`;
    })
    .join("\n\n");

  const supplementalText = supplementalContext
    .filter((item) => item.content.trim())
    .map((item, index) => `Supplemental Source ${index + 1} (${item.label}):\n${item.content.trim()}`)
    .join("\n\n");

  if (!courseContext && !supplementalText) {
    throw new AppError("Upload course handouts or sync relevant course materials before building a quiz study note.", 422);
  }

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You create exam prep notes for students using only the provided source context. Return JSON with keys topic, noteTitle, noteSections, practiceQuestions. noteSections must be an array of objects with heading and content. practiceQuestions must be an array of 4 multiple choice questions with keys question, options, answer, explanation. Use exactly 4 string options per question."
      },
      {
        role: "user",
        content: `Course: ${courseName}\nStudy Goal: ${studyGoal}\n\nContext:\n${courseContext}\n\n${supplementalText}`
      }
    ]
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new AppError("Model returned an empty quiz prep pack", 502);
  }

  let parsed: {
    topic?: unknown;
    noteTitle?: unknown;
    noteSections?: unknown;
    practiceQuestions?: unknown;
  };

  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    throw new AppError("Model returned invalid quiz prep JSON", 502);
  }

  const topic =
    typeof parsed.topic === "string" && parsed.topic.trim() ? parsed.topic.trim() : studyGoal.trim();
  const noteTitle =
    typeof parsed.noteTitle === "string" && parsed.noteTitle.trim()
      ? parsed.noteTitle.trim()
      : `Study Note: ${topic}`;

  const noteSections = Array.isArray(parsed.noteSections)
    ? parsed.noteSections
        .map((section) => {
          if (!section || typeof section !== "object") {
            return null;
          }

          const typedSection = section as Record<string, unknown>;
          const heading =
            typeof typedSection.heading === "string" && typedSection.heading.trim()
              ? typedSection.heading.trim()
              : "";
          const content =
            typeof typedSection.content === "string" && typedSection.content.trim()
              ? typedSection.content.trim()
              : "";

          if (!heading || !content) {
            return null;
          }

          return { heading, content };
        })
        .filter((section): section is QuizPrepSection => Boolean(section))
    : [];

  const practiceQuestions = Array.isArray(parsed.practiceQuestions)
    ? parsed.practiceQuestions
        .map((question) => {
          if (!question || typeof question !== "object") {
            return null;
          }

          const typedQuestion = question as Record<string, unknown>;
          const prompt =
            typeof typedQuestion.question === "string" && typedQuestion.question.trim()
              ? typedQuestion.question.trim()
              : "";
          const options = Array.isArray(typedQuestion.options)
            ? typedQuestion.options.filter((item): item is string => typeof item === "string").map((item) => item.trim())
            : [];
          const answer =
            typeof typedQuestion.answer === "string" && typedQuestion.answer.trim()
              ? typedQuestion.answer.trim()
              : "";
          const explanation =
            typeof typedQuestion.explanation === "string" && typedQuestion.explanation.trim()
              ? typedQuestion.explanation.trim()
              : null;

          if (!prompt || options.length !== 4 || !answer) {
            return null;
          }

          return {
            question: prompt,
            options,
            answer,
            explanation
          };
        })
        .filter((question): question is QuizPrepQuestion => Boolean(question))
    : [];

  const sources: QuizPrepSource[] = [
    ...relevantChunks.map(({ chunk }) => {
      const document = documentById.get(chunk.documentId);
      return {
        label: document?.fileName ?? "course handout",
        kind: "handout" as const,
        excerpt: chunk.content.slice(0, 240)
      };
    }),
    ...supplementalContext
      .filter((item) => item.content.trim())
      .slice(0, 4)
      .map((item) => ({
        label: item.label,
        kind: "classroom_material" as const,
        excerpt: item.content.trim().slice(0, 240)
      }))
  ];

  if (noteSections.length === 0 && practiceQuestions.length === 0) {
    throw new AppError("Could not build a useful quiz prep pack from the available sources", 502);
  }

  return {
    topic,
    noteTitle,
    noteSections,
    practiceQuestions,
    sources
  };
}
