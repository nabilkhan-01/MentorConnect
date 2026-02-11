import { relations } from "drizzle-orm/relations";
import { users, errorLogs, mentors, messages, mentees, selfAssessments, notifications, academicRecords, subjects } from "./schema";

export const errorLogsRelations = relations(errorLogs, ({one}) => ({
	user: one(users, {
		fields: [errorLogs.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	errorLogs: many(errorLogs),
	mentors: many(mentors),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	notifications: many(notifications),
	mentees: many(mentees),
}));

export const mentorsRelations = relations(mentors, ({one, many}) => ({
	user: one(users, {
		fields: [mentors.userId],
		references: [users.id]
	}),
	messages: many(messages),
	mentees: many(mentees),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
	mentor: one(mentors, {
		fields: [messages.mentorId],
		references: [mentors.id]
	}),
}));

export const selfAssessmentsRelations = relations(selfAssessments, ({one}) => ({
	mentee: one(mentees, {
		fields: [selfAssessments.menteeId],
		references: [mentees.id]
	}),
}));

export const menteesRelations = relations(mentees, ({one, many}) => ({
	selfAssessments: many(selfAssessments),
	user: one(users, {
		fields: [mentees.userId],
		references: [users.id]
	}),
	mentor: one(mentors, {
		fields: [mentees.mentorId],
		references: [mentors.id]
	}),
	academicRecords: many(academicRecords),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.targetUserId],
		references: [users.id]
	}),
}));

export const academicRecordsRelations = relations(academicRecords, ({one}) => ({
	mentee: one(mentees, {
		fields: [academicRecords.menteeId],
		references: [mentees.id]
	}),
	subject: one(subjects, {
		fields: [academicRecords.subjectId],
		references: [subjects.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({many}) => ({
	academicRecords: many(academicRecords),
}));