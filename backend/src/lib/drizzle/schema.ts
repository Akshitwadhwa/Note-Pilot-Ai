import { integer, jsonb, pgEnum, pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const dayOfWeekEnum = pgEnum('DayOfWeek', [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

// Tables
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const timetables = pgTable(
  'timetable',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    dayOfWeek: dayOfWeekEnum('dayOfWeek').notNull(),
    startTime: text('startTime').notNull(),
    endTime: text('endTime').notNull(),
    subjectName: text('subjectName').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdIndex: index('Timetable_userId_dayOfWeek_startTime_endTime_idx').on(
      table.userId,
      table.dayOfWeek,
      table.startTime,
      table.endTime
    ),
  })
);

export const courses = pgTable(
  'course',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalizedName').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdIndex: index('Course_userId_idx').on(table.userId),
    userIdNormalizedNameUnique: uniqueIndex('Course_userId_normalizedName_key').on(
      table.userId,
      table.normalizedName
    ),
  })
);

export const courseDocuments = pgTable(
  'course_document',
  {
    id: text('id').primaryKey(),
    courseId: text('courseId').notNull(),
    userId: text('userId').notNull(),
    fileName: text('fileName').notNull(),
    mimeType: text('mimeType').notNull(),
    byteSize: integer('byteSize').notNull(),
    extractedText: text('extractedText').notNull(),
    syllabusSummary: text('syllabusSummary'),
    credits: text('credits'),
    evaluationCriteria: text('evaluationCriteria'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    courseIdIndex: index('CourseDocument_courseId_idx').on(table.courseId),
    userIdIndex: index('CourseDocument_userId_idx').on(table.userId),
  })
);

export const courseDocumentChunks = pgTable(
  'course_document_chunk',
  {
    id: text('id').primaryKey(),
    documentId: text('documentId').notNull(),
    courseId: text('courseId').notNull(),
    userId: text('userId').notNull(),
    chunkIndex: integer('chunkIndex').notNull(),
    content: text('content').notNull(),
    embedding: jsonb('embedding').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    courseIdIndex: index('CourseDocumentChunk_courseId_idx').on(table.courseId),
    documentIdIndex: index('CourseDocumentChunk_documentId_idx').on(table.documentId),
  })
);

export const notes = pgTable(
  'note',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    timetableId: text('timetableId').notNull(),
    content: text('content').notNull(),
    summary: text('summary'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    timetableIdTimestampIndex: index('Note_timetableId_timestamp_idx').on(table.timetableId, table.timestamp),
    userIdTimestampIndex: index('Note_userId_timestamp_idx').on(table.userId, table.timestamp),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  timetableEntries: many(timetables),
  courses: many(courses),
  courseDocuments: many(courseDocuments),
  courseDocumentChunks: many(courseDocumentChunks),
  notes: many(notes),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  documents: many(courseDocuments),
}));

export const courseDocumentsRelations = relations(courseDocuments, ({ one, many }) => ({
  user: one(users, {
    fields: [courseDocuments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [courseDocuments.courseId],
    references: [courses.id],
  }),
  chunks: many(courseDocumentChunks),
}));

export const courseDocumentChunksRelations = relations(courseDocumentChunks, ({ one }) => ({
  user: one(users, {
    fields: [courseDocumentChunks.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [courseDocumentChunks.courseId],
    references: [courses.id],
  }),
  document: one(courseDocuments, {
    fields: [courseDocumentChunks.documentId],
    references: [courseDocuments.id],
  }),
}));

export const timetablesRelations = relations(timetables, ({ one, many }) => ({
  user: one(users, {
    fields: [timetables.userId],
    references: [users.id],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  timetable: one(timetables, {
    fields: [notes.timetableId],
    references: [timetables.id],
  }),
}));
