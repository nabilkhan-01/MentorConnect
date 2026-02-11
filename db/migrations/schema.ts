import { pgTable, foreignKey, serial, integer, text, timestamp, unique, boolean, real, json, index, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const errorLogs = pgTable("error_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	errorMessage: text("error_message").notNull(),
	stackTrace: text("stack_trace"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		errorLogsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "error_logs_user_id_users_id_fk"
		}),
	}
});

export const mentors = pgTable("mentors", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	department: text(),
	specialization: text(),
	mobileNumber: text("mobile_number"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		mentorsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mentors_user_id_users_id_fk"
		}),
		mentorsUserIdUnique: unique("mentors_user_id_unique").on(table.userId),
	}
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	senderId: integer("sender_id").notNull(),
	receiverId: integer("receiver_id"),
	content: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	mentorId: integer("mentor_id"),
	isGroupMessage: boolean("is_group_message").default(false).notNull(),
}, (table) => {
	return {
		messagesSenderIdUsersIdFk: foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
		messagesReceiverIdUsersIdFk: foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "messages_receiver_id_users_id_fk"
		}),
		messagesMentorIdMentorsIdFk: foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "messages_mentor_id_mentors_id_fk"
		}),
	}
});

export const selfAssessments = pgTable("self_assessments", {
	id: serial().primaryKey().notNull(),
	menteeId: integer("mentee_id").notNull(),
	academicGoals: text("academic_goals").notNull(),
	careerAspirations: text("career_aspirations").notNull(),
	strengths: text().notNull(),
	areasToImprove: text("areas_to_improve").notNull(),
	studyHoursPerDay: real("study_hours_per_day").notNull(),
	stressLevel: integer("stress_level").notNull(),
	academicConfidence: text("academic_confidence").notNull(),
	challenges: text().notNull(),
	supportNeeded: text("support_needed").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		selfAssessmentsMenteeIdMenteesIdFk: foreignKey({
			columns: [table.menteeId],
			foreignColumns: [mentees.id],
			name: "self_assessments_mentee_id_mentees_id_fk"
		}),
	}
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	message: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	isUrgent: boolean("is_urgent").default(false).notNull(),
	targetRoles: json("target_roles").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	targetUserId: integer("target_user_id"),
}, (table) => {
	return {
		notificationsTargetUserIdUsersIdFk: foreignKey({
			columns: [table.targetUserId],
			foreignColumns: [users.id],
			name: "notifications_target_user_id_users_id_fk"
		}),
	}
});

export const mentees = pgTable("mentees", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	usn: text().notNull(),
	mentorId: integer("mentor_id"),
	semester: integer().notNull(),
	section: text().notNull(),
	mobileNumber: text("mobile_number"),
	parentMobileNumber: text("parent_mobile_number"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		menteesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mentees_user_id_users_id_fk"
		}),
		menteesMentorIdMentorsIdFk: foreignKey({
			columns: [table.mentorId],
			foreignColumns: [mentors.id],
			name: "mentees_mentor_id_mentors_id_fk"
		}),
		menteesUserIdUnique: unique("mentees_user_id_unique").on(table.userId),
		menteesUsnUnique: unique("mentees_usn_unique").on(table.usn),
	}
});

export const academicRecords = pgTable("academic_records", {
	id: serial().primaryKey().notNull(),
	menteeId: integer("mentee_id").notNull(),
	subjectId: integer("subject_id").notNull(),
	cie1Marks: real("cie1_marks"),
	cie2Marks: real("cie2_marks"),
	cie3Marks: real("cie3_marks"),
	avgCieMarks: real("avg_cie_marks"),
	assignmentMarks: real("assignment_marks"),
	totalMarks: real("total_marks"),
	attendance: real(),
	semester: integer().notNull(),
	academicYear: text("academic_year").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		academicRecordsMenteeIdMenteesIdFk: foreignKey({
			columns: [table.menteeId],
			foreignColumns: [mentees.id],
			name: "academic_records_mentee_id_mentees_id_fk"
		}),
		academicRecordsSubjectIdSubjectsIdFk: foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "academic_records_subject_id_subjects_id_fk"
		}),
	}
});

export const subjects = pgTable("subjects", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	semester: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		subjectsCodeUnique: unique("subjects_code_unique").on(table.code),
	}
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	role: text().default('mentee').notNull(),
	email: text(),
	name: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		usersUsernameUnique: unique("users_username_unique").on(table.username),
	}
});

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => {
	return {
		idxSessionExpire: index("IDX_session_expire").using("btree", table.expire.asc().nullsLast()),
	}
});
