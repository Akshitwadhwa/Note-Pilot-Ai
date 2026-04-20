import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
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

export const googleClassroomConnections = pgTable(
  'google_classroom_connection',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    googleUserId: text('googleUserId'),
    googleEmail: text('googleEmail').notNull(),
    accessToken: text('accessToken').notNull(),
    refreshToken: text('refreshToken'),
    scope: text('scope'),
    tokenExpiryAt: timestamp('tokenExpiryAt'),
    lastSyncedAt: timestamp('lastSyncedAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdUnique: uniqueIndex('GoogleClassroomConnection_userId_key').on(table.userId),
  })
);

export const googleClassroomMaterials = pgTable(
  'google_classroom_material',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    externalId: text('externalId').notNull(),
    sourceType: text('sourceType').notNull(),
    courseGoogleId: text('courseGoogleId'),
    courseName: text('courseName'),
    title: text('title').notNull(),
    description: text('description'),
    alternateLink: text('alternateLink'),
    topicId: text('topicId'),
    state: text('state'),
    extractedText: text('extractedText'),
    metadata: jsonb('metadata'),
    publishedAt: timestamp('publishedAt'),
    sourceUpdatedAt: timestamp('sourceUpdatedAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdIndex: index('GoogleClassroomMaterial_userId_idx').on(table.userId),
    userIdPublishedAtIndex: index('GoogleClassroomMaterial_userId_publishedAt_idx').on(
      table.userId,
      table.publishedAt
    ),
    userIdCourseGoogleIdIndex: index('GoogleClassroomMaterial_userId_courseGoogleId_idx').on(
      table.userId,
      table.courseGoogleId
    ),
    userIdExternalIdUnique: uniqueIndex('GoogleClassroomMaterial_userId_externalId_key').on(
      table.userId,
      table.externalId
    ),
  })
);

export const googleClassroomMaterialAttachments = pgTable(
  'google_classroom_material_attachment',
  {
    id: text('id').primaryKey(),
    materialId: text('materialId').notNull(),
    userId: text('userId').notNull(),
    attachmentType: text('attachmentType').notNull(),
    title: text('title'),
    url: text('url'),
    driveFileId: text('driveFileId'),
    mimeType: text('mimeType'),
    thumbnailUrl: text('thumbnailUrl'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    materialIdIndex: index('GoogleClassroomMaterialAttachment_materialId_idx').on(table.materialId),
    userIdIndex: index('GoogleClassroomMaterialAttachment_userId_idx').on(table.userId),
  })
);

export const materialAiAnalyses = pgTable(
  'material_ai_analysis',
  {
    id: text('id').primaryKey(),
    materialId: text('materialId').notNull(),
    userId: text('userId').notNull(),
    summary: text('summary').notNull(),
    keyPoints: jsonb('keyPoints').notNull(),
    topicTags: jsonb('topicTags').notNull(),
    sourceText: text('sourceText').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    materialIdUnique: uniqueIndex('MaterialAiAnalysis_materialId_key').on(table.materialId),
    userIdIndex: index('MaterialAiAnalysis_userId_idx').on(table.userId),
  })
);

export const materialQuizzes = pgTable(
  'material_quiz',
  {
    id: text('id').primaryKey(),
    materialId: text('materialId').notNull(),
    userId: text('userId').notNull(),
    title: text('title').notNull(),
    instructions: text('instructions'),
    totalQuestions: integer('totalQuestions').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    materialIdIndex: index('MaterialQuiz_materialId_idx').on(table.materialId),
    userIdIndex: index('MaterialQuiz_userId_idx').on(table.userId),
  })
);

export const materialQuizQuestions = pgTable(
  'material_quiz_question',
  {
    id: text('id').primaryKey(),
    quizId: text('quizId').notNull(),
    materialId: text('materialId').notNull(),
    userId: text('userId').notNull(),
    position: integer('position').notNull(),
    type: text('type').notNull(),
    question: text('question').notNull(),
    options: jsonb('options'),
    answer: text('answer').notNull(),
    explanation: text('explanation'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    quizIdIndex: index('MaterialQuizQuestion_quizId_idx').on(table.quizId),
    materialIdIndex: index('MaterialQuizQuestion_materialId_idx').on(table.materialId),
  })
);

export const materialQuizAttempts = pgTable(
  'material_quiz_attempt',
  {
    id: text('id').primaryKey(),
    quizId: text('quizId').notNull(),
    materialId: text('materialId').notNull(),
    userId: text('userId').notNull(),
    score: integer('score').notNull(),
    totalQuestions: integer('totalQuestions').notNull(),
    answers: jsonb('answers').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    quizIdIndex: index('MaterialQuizAttempt_quizId_idx').on(table.quizId),
    materialIdIndex: index('MaterialQuizAttempt_materialId_idx').on(table.materialId),
    userIdIndex: index('MaterialQuizAttempt_userId_idx').on(table.userId),
  })
);

export const notes = pgTable(
  'note',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    timetableId: text('timetableId').notNull(),
    sessionDate: text('sessionDate').notNull(),
    content: text('content').notNull(),
    summary: text('summary'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    timetableIdSessionDateIndex: index('Note_timetableId_sessionDate_idx').on(table.timetableId, table.sessionDate),
    timetableIdTimestampIndex: index('Note_timetableId_timestamp_idx').on(table.timetableId, table.timestamp),
    userIdSessionDateIndex: index('Note_userId_sessionDate_idx').on(table.userId, table.sessionDate),
    userIdTimestampIndex: index('Note_userId_timestamp_idx').on(table.userId, table.timestamp),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  timetableEntries: many(timetables),
  courses: many(courses),
  courseDocuments: many(courseDocuments),
  courseDocumentChunks: many(courseDocumentChunks),
  googleClassroomConnections: many(googleClassroomConnections),
  googleClassroomMaterials: many(googleClassroomMaterials),
  googleClassroomMaterialAttachments: many(googleClassroomMaterialAttachments),
  materialAiAnalyses: many(materialAiAnalyses),
  materialQuizzes: many(materialQuizzes),
  materialQuizQuestions: many(materialQuizQuestions),
  materialQuizAttempts: many(materialQuizAttempts),
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

export const googleClassroomConnectionsRelations = relations(googleClassroomConnections, ({ one }) => ({
  user: one(users, {
    fields: [googleClassroomConnections.userId],
    references: [users.id],
  }),
}));

export const googleClassroomMaterialsRelations = relations(googleClassroomMaterials, ({ one, many }) => ({
  user: one(users, {
    fields: [googleClassroomMaterials.userId],
    references: [users.id],
  }),
  attachments: many(googleClassroomMaterialAttachments),
  analysis: one(materialAiAnalyses, {
    fields: [googleClassroomMaterials.id],
    references: [materialAiAnalyses.materialId],
  }),
  quizzes: many(materialQuizzes),
  attempts: many(materialQuizAttempts),
}));

export const googleClassroomMaterialAttachmentsRelations = relations(
  googleClassroomMaterialAttachments,
  ({ one }) => ({
    user: one(users, {
      fields: [googleClassroomMaterialAttachments.userId],
      references: [users.id],
    }),
    material: one(googleClassroomMaterials, {
      fields: [googleClassroomMaterialAttachments.materialId],
      references: [googleClassroomMaterials.id],
    }),
  })
);

export const materialAiAnalysesRelations = relations(materialAiAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [materialAiAnalyses.userId],
    references: [users.id],
  }),
  material: one(googleClassroomMaterials, {
    fields: [materialAiAnalyses.materialId],
    references: [googleClassroomMaterials.id],
  }),
}));

export const materialQuizzesRelations = relations(materialQuizzes, ({ one, many }) => ({
  user: one(users, {
    fields: [materialQuizzes.userId],
    references: [users.id],
  }),
  material: one(googleClassroomMaterials, {
    fields: [materialQuizzes.materialId],
    references: [googleClassroomMaterials.id],
  }),
  questions: many(materialQuizQuestions),
  attempts: many(materialQuizAttempts),
}));

export const materialQuizQuestionsRelations = relations(materialQuizQuestions, ({ one }) => ({
  user: one(users, {
    fields: [materialQuizQuestions.userId],
    references: [users.id],
  }),
  material: one(googleClassroomMaterials, {
    fields: [materialQuizQuestions.materialId],
    references: [googleClassroomMaterials.id],
  }),
  quiz: one(materialQuizzes, {
    fields: [materialQuizQuestions.quizId],
    references: [materialQuizzes.id],
  }),
}));

export const materialQuizAttemptsRelations = relations(materialQuizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [materialQuizAttempts.userId],
    references: [users.id],
  }),
  material: one(googleClassroomMaterials, {
    fields: [materialQuizAttempts.materialId],
    references: [googleClassroomMaterials.id],
  }),
  quiz: one(materialQuizzes, {
    fields: [materialQuizAttempts.quizId],
    references: [materialQuizzes.id],
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
