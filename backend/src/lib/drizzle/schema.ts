import { pgTable, text, timestamp, index, pgEnum, serial } from 'drizzle-orm/pg-core';
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
  notes: many(notes),
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
