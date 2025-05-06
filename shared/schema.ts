import { pgTable, text, serial, integer, boolean, timestamp, real, foreignKey, json } from "drizzle-orm/pg-core";
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
  cie1Marks: real("cie1_marks"),  // CIE 1 marks out of 30
  cie2Marks: real("cie2_marks"),  // CIE 2 marks out of 30
  cie3Marks: real("cie3_marks"),  // CIE 3 marks out of 30
  avgCieMarks: real("avg_cie_marks"),  // Average of CIE marks out of 30
  assignmentMarks: real("assignment_marks"),  // Assignment marks out of 20
  totalMarks: real("total_marks"),  // Total = avgCieMarks + assignmentMarks (out of 50)
  attendance: real("attendance"),  // Attendance percentage
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

// Self-assessment table
export const selfAssessments = pgTable("self_assessments", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").references(() => mentees.id).notNull(),
  academicGoals: text("academic_goals").notNull(),
  careerAspirations: text("career_aspirations").notNull(),
  strengths: text("strengths").notNull(),
  areasToImprove: text("areas_to_improve").notNull(),
  studyHoursPerDay: real("study_hours_per_day").notNull(),
  stressLevel: integer("stress_level").notNull(),
  academicConfidence: text("academic_confidence").notNull(),
  challenges: text("challenges").notNull(),
  supportNeeded: text("support_needed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  isUrgent: boolean("is_urgent").default(false).notNull(),
  targetRoles: json("target_roles").notNull().$type<string[]>(), // Roles that should see this notification
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selfAssessmentsRelations = relations(selfAssessments, ({ one }) => ({
  mentee: one(mentees, {
    fields: [selfAssessments.menteeId],
    references: [mentees.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
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
  cie1Marks: (schema) => schema.gte(0, "CIE 1 marks cannot be negative").lte(30, "CIE 1 marks cannot exceed 30"),
  cie2Marks: (schema) => schema.gte(0, "CIE 2 marks cannot be negative").lte(30, "CIE 2 marks cannot exceed 30"),
  cie3Marks: (schema) => schema.gte(0, "CIE 3 marks cannot be negative").lte(30, "CIE 3 marks cannot exceed 30"),
  avgCieMarks: (schema) => schema.gte(0, "Average CIE marks cannot be negative").lte(30, "Average CIE marks cannot exceed 30"),
  assignmentMarks: (schema) => schema.gte(0, "Assignment marks cannot be negative").lte(20, "Assignment marks cannot exceed 20"),
  totalMarks: (schema) => schema.gte(0, "Total marks cannot be negative").lte(50, "Total marks cannot exceed 50"),
  attendance: (schema) => schema.gte(0, "Attendance cannot be negative").lte(100, "Attendance cannot exceed 100%"),
});
export const selectAcademicRecordSchema = createSelectSchema(academicRecords);

export const insertErrorLogSchema = createInsertSchema(errorLogs);
export const selectErrorLogSchema = createSelectSchema(errorLogs);

// Self-Assessment and Message schemas
export const insertSelfAssessmentSchema = createInsertSchema(selfAssessments, {
  academicGoals: (schema) => schema.min(10, "Academic goals must be at least 10 characters"),
  careerAspirations: (schema) => schema.min(10, "Career aspirations must be at least 10 characters"),
  strengths: (schema) => schema.min(5, "Strengths must be at least 5 characters"),
  areasToImprove: (schema) => schema.min(5, "Areas to improve must be at least 5 characters"),
  studyHoursPerDay: (schema) => schema.gte(0, "Study hours cannot be negative").lte(24, "Study hours cannot exceed 24"),
  stressLevel: (schema) => schema.gte(1, "Stress level must be at least 1").lte(5, "Stress level cannot exceed 5"),
  academicConfidence: (schema) => schema.refine(
    (val) => ["very_low", "low", "moderate", "high", "very_high"].includes(val),
    { message: "Invalid academic confidence level" }
  ),
  challenges: (schema) => schema.min(5, "Challenges must be at least 5 characters"),
  supportNeeded: (schema) => schema.min(5, "Support needed must be at least 5 characters"),
});
export const selectSelfAssessmentSchema = createSelectSchema(selfAssessments);

export const insertMessageSchema = createInsertSchema(messages, {
  content: (schema) => schema.min(1, "Message cannot be empty").max(1000, "Message is too long"),
});
export const selectMessageSchema = createSelectSchema(messages);

export const insertNotificationSchema = createInsertSchema(notifications, {
  message: (schema) => schema.min(5, "Notification message must be at least 5 characters"),
  targetRoles: (schema) => schema.refine(
    (val) => Array.isArray(val) && val.length > 0,
    { message: "Target roles must be a non-empty array" }
  ),
});
export const selectNotificationSchema = createSelectSchema(notifications);

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

export type InsertSelfAssessment = z.infer<typeof insertSelfAssessmentSchema>;
export type SelfAssessment = z.infer<typeof selectSelfAssessmentSchema>;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = z.infer<typeof selectMessageSchema>;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = z.infer<typeof selectNotificationSchema>;
