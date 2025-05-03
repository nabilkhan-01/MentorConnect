import { pgTable, text, serial, integer, boolean, timestamp, real, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Types
export const UserRole = {
  ADMIN: "admin",
  MENTOR: "mentor",
  MENTEE: "mentee",
} as const;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.MENTEE),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentors table
export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  department: text("department"),
  specialization: text("specialization"),
  mobileNumber: text("mobile_number"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentees/Students table
export const mentees = pgTable("mentees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  usn: text("usn").notNull().unique(),
  mentorId: integer("mentor_id").references(() => mentors.id),
  semester: integer("semester").notNull(),
  section: text("section").notNull(),
  mobileNumber: text("mobile_number"),
  parentMobileNumber: text("parent_mobile_number"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  semester: integer("semester").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Academic records table
export const academicRecords = pgTable("academic_records", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").references(() => mentees.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  cieMarks: real("cie_marks"),
  assignmentMarks: real("assignment_marks"),
  totalMarks: real("total_marks"),
  attendance: real("attendance"),
  semester: integer("semester").notNull(),
  academicYear: text("academic_year").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Error logs table
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  mentor: one(mentors, {
    fields: [users.id],
    references: [mentors.userId],
  }),
  mentee: one(mentees, {
    fields: [users.id],
    references: [mentees.userId],
  }),
  errorLogs: many(errorLogs),
}));

export const mentorsRelations = relations(mentors, ({ one, many }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
  mentees: many(mentees),
}));

export const menteesRelations = relations(mentees, ({ one, many }) => ({
  user: one(users, {
    fields: [mentees.userId],
    references: [users.id],
  }),
  mentor: one(mentors, {
    fields: [mentees.mentorId],
    references: [mentors.id],
  }),
  academicRecords: many(academicRecords),
}));

export const academicRecordsRelations = relations(academicRecords, ({ one }) => ({
  mentee: one(mentees, {
    fields: [academicRecords.menteeId],
    references: [mentees.id],
  }),
  subject: one(subjects, {
    fields: [academicRecords.subjectId],
    references: [subjects.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  academicRecords: many(academicRecords),
}));

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  role: (schema) => schema.refine(
    (val) => [UserRole.ADMIN, UserRole.MENTOR, UserRole.MENTEE].includes(val as any),
    { message: "Invalid role" }
  ),
  email: (schema) => schema.email("Must provide a valid email").nullable().optional(),
});

export const selectUserSchema = createSelectSchema(users);

export const insertMentorSchema = createInsertSchema(mentors);
export const selectMentorSchema = createSelectSchema(mentors);

export const insertMenteeSchema = createInsertSchema(mentees, {
  usn: (schema) => schema.min(5, "USN must be at least 5 characters"),
  semester: (schema) => schema.min(1, "Semester must be at least 1").max(8, "Semester cannot be more than 8"),
});
export const selectMenteeSchema = createSelectSchema(mentees);

export const insertSubjectSchema = createInsertSchema(subjects);
export const selectSubjectSchema = createSelectSchema(subjects);

export const insertAcademicRecordSchema = createInsertSchema(academicRecords, {
  cieMarks: (schema) => schema.gte(0, "CIE marks cannot be negative").lte(50, "CIE marks cannot exceed 50"),
  assignmentMarks: (schema) => schema.gte(0, "Assignment marks cannot be negative").lte(50, "Assignment marks cannot exceed 50"),
  totalMarks: (schema) => schema.gte(0, "Total marks cannot be negative").lte(100, "Total marks cannot exceed 100"),
  attendance: (schema) => schema.gte(0, "Attendance cannot be negative").lte(100, "Attendance cannot exceed 100%"),
});
export const selectAcademicRecordSchema = createSelectSchema(academicRecords);

export const insertErrorLogSchema = createInsertSchema(errorLogs);
export const selectErrorLogSchema = createSelectSchema(errorLogs);

// Type exports for use in the application
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export type InsertMentor = z.infer<typeof insertMentorSchema>;
export type Mentor = z.infer<typeof selectMentorSchema>;

export type InsertMentee = z.infer<typeof insertMenteeSchema>;
export type Mentee = z.infer<typeof selectMenteeSchema>;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = z.infer<typeof selectSubjectSchema>;

export type InsertAcademicRecord = z.infer<typeof insertAcademicRecordSchema>;
export type AcademicRecord = z.infer<typeof selectAcademicRecordSchema>;

export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorLog = z.infer<typeof selectErrorLogSchema>;
