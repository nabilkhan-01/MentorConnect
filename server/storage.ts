import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, asc, desc, lt, gt, sql, count, avg } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";

// Extend the schema types for internal use
interface MenteeWithDetails extends schema.Mentee {
  name?: string;
  email?: string;
  attendance?: number;
  mentorName?: string;
}

interface MentorWithDetails extends schema.Mentor {
  name?: string;
  email?: string;
  menteeCount?: number;
}

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser: (id: number) => Promise<schema.User>;
  getUserByUsername: (username: string) => Promise<schema.User | undefined>;
  createUser: (user: Omit<schema.InsertUser, "id">) => Promise<schema.User>;
  updateUser: (id: number, userData: Partial<schema.InsertUser>) => Promise<schema.User>;
  deleteUser: (id: number) => Promise<void>;

  // Mentor operations
  getMentor: (id: number) => Promise<schema.Mentor | undefined>;
  getMentorByUserId: (userId: number) => Promise<schema.Mentor | undefined>;
  getMentorWithDetails: (id: number) => Promise<MentorWithDetails | undefined>;
  getAllMentors: () => Promise<schema.Mentor[]>;
  getAllMentorsWithDetails: () => Promise<MentorWithDetails[]>;
  createMentor: (mentor: Omit<schema.InsertMentor, "id">) => Promise<schema.Mentor>;
  updateMentor: (id: number, mentorData: Partial<schema.InsertMentor>) => Promise<schema.Mentor>;
  deleteMentor: (id: number) => Promise<void>;
  countMentors: () => Promise<number>;

  // Mentee operations
  getMentee: (id: number) => Promise<schema.Mentee | undefined>;
  getMenteeByUserId: (userId: number) => Promise<schema.Mentee | undefined>;
  getMenteeByUsn: (usn: string) => Promise<schema.Mentee | undefined>;
  getMenteeWithDetails: (id: number) => Promise<MenteeWithDetails | undefined>;
  getAllMentees: () => Promise<schema.Mentee[]>;
  getAllMenteesWithDetails: () => Promise<MenteeWithDetails[]>;
  getMenteesByMentor: (mentorId: number) => Promise<MenteeWithDetails[]>;
  createMentee: (mentee: Omit<schema.InsertMentee, "id">) => Promise<schema.Mentee>;
  updateMentee: (id: number, menteeData: Partial<schema.InsertMentee>) => Promise<schema.Mentee>;
  deleteMentee: (id: number) => Promise<void>;
  countMentees: () => Promise<number>;
  countMenteesByMentor: (mentorId: number) => Promise<number>;
  reassignMentees: (fromMentorId: number) => Promise<void>;
  
  // Academic record operations
  getAcademicRecord: (menteeId: number, subjectId: number, semester: number, academicYear: string) => Promise<schema.AcademicRecord | undefined>;
  getAcademicRecordsByMentee: (menteeId: number) => Promise<schema.AcademicRecord[]>;
  createAcademicRecord: (record: Omit<schema.InsertAcademicRecord, "id">) => Promise<schema.AcademicRecord>;
  updateAcademicRecord: (id: number, recordData: Partial<schema.InsertAcademicRecord>) => Promise<schema.AcademicRecord>;
  deleteAcademicRecord: (id: number) => Promise<void>;
  
  // At-risk student operations
  getAtRiskMentees: () => Promise<MenteeWithDetails[]>;
  getAtRiskMenteesByMentor: (mentorId: number) => Promise<MenteeWithDetails[]>;
  countAtRiskMentees: () => Promise<number>;
  countAtRiskMenteesByMentor: (mentorId: number) => Promise<number>;
  
  // Subject operations
  getAllSubjects: () => Promise<schema.Subject[]>;
  
  // Error log operations
  createErrorLog: (log: Omit<schema.InsertErrorLog, "id">) => Promise<schema.ErrorLog>;
  getErrorLogs: () => Promise<schema.ErrorLog[]>;
  
  // Analytics operations
  getAverageAttendanceByMentor: (mentorId: number) => Promise<number>;
  getMenteeSemesterDistribution: (mentorId: number) => Promise<Record<number, number>>;
  
  // Session store
  sessionStore: session.SessionStore;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<schema.User> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
  }

  async createUser(user: Omit<schema.InsertUser, "id">): Promise<schema.User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<schema.InsertUser>): Promise<schema.User> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error(`User with ID ${id} not found`);
    }

    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Mentor operations
  async getMentor(id: number): Promise<schema.Mentor | undefined> {
    return await db.query.mentors.findFirst({
      where: eq(schema.mentors.id, id),
    });
  }

  async getMentorByUserId(userId: number): Promise<schema.Mentor | undefined> {
    return await db.query.mentors.findFirst({
      where: eq(schema.mentors.userId, userId),
    });
  }

  async getMentorWithDetails(id: number): Promise<MentorWithDetails | undefined> {
    const mentor = await db.query.mentors.findFirst({
      where: eq(schema.mentors.id, id),
      with: {
        user: true,
      },
    });

    if (!mentor) return undefined;

    const menteeCount = await this.countMenteesByMentor(id);

    return {
      ...mentor,
      name: mentor.user?.name,
      email: mentor.user?.email,
      menteeCount,
    };
  }

  async getAllMentors(): Promise<schema.Mentor[]> {
    return await db.query.mentors.findMany({
      where: eq(schema.mentors.isActive, true),
    });
  }

  async getAllMentorsWithDetails(): Promise<MentorWithDetails[]> {
    const mentors = await db.query.mentors.findMany({
      with: {
        user: true,
      },
      orderBy: [asc(schema.mentors.id)],
    });

    const result: MentorWithDetails[] = [];

    for (const mentor of mentors) {
      const menteeCount = await this.countMenteesByMentor(mentor.id);
      
      result.push({
        ...mentor,
        name: mentor.user?.name,
        email: mentor.user?.email,
        menteeCount,
      });
    }

    return result;
  }

  async createMentor(mentor: Omit<schema.InsertMentor, "id">): Promise<schema.Mentor> {
    const [newMentor] = await db.insert(schema.mentors).values(mentor).returning();
    return newMentor;
  }

  async updateMentor(id: number, mentorData: Partial<schema.InsertMentor>): Promise<schema.Mentor> {
    const [updatedMentor] = await db
      .update(schema.mentors)
      .set({
        ...mentorData,
        updatedAt: new Date(),
      })
      .where(eq(schema.mentors.id, id))
      .returning();

    if (!updatedMentor) {
      throw new Error(`Mentor with ID ${id} not found`);
    }

    return updatedMentor;
  }

  async deleteMentor(id: number): Promise<void> {
    await db.delete(schema.mentors).where(eq(schema.mentors.id, id));
  }

  async countMentors(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.mentors)
      .where(eq(schema.mentors.isActive, true));

    return result[0]?.count || 0;
  }

  // Mentee operations
  async getMentee(id: number): Promise<schema.Mentee | undefined> {
    return await db.query.mentees.findFirst({
      where: eq(schema.mentees.id, id),
    });
  }

  async getMenteeByUserId(userId: number): Promise<schema.Mentee | undefined> {
    return await db.query.mentees.findFirst({
      where: eq(schema.mentees.userId, userId),
    });
  }

  async getMenteeByUsn(usn: string): Promise<schema.Mentee | undefined> {
    return await db.query.mentees.findFirst({
      where: eq(schema.mentees.usn, usn),
    });
  }

  async getMenteeWithDetails(id: number): Promise<MenteeWithDetails | undefined> {
    const mentee = await db.query.mentees.findFirst({
      where: eq(schema.mentees.id, id),
      with: {
        user: true,
        mentor: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!mentee) return undefined;

    // Calculate average attendance
    const records = await db.query.academicRecords.findMany({
      where: eq(schema.academicRecords.menteeId, id),
    });

    const attendance = records.length
      ? records.reduce((sum, record) => sum + (record.attendance || 0), 0) / records.length
      : undefined;

    return {
      ...mentee,
      name: mentee.user?.name,
      email: mentee.user?.email,
      attendance,
      mentorName: mentee.mentor?.user?.name,
    };
  }

  async getAllMentees(): Promise<schema.Mentee[]> {
    return await db.query.mentees.findMany({
      where: eq(schema.mentees.isActive, true),
      orderBy: [asc(schema.mentees.id)],
    });
  }

  async getAllMenteesWithDetails(): Promise<MenteeWithDetails[]> {
    const mentees = await db.query.mentees.findMany({
      where: eq(schema.mentees.isActive, true),
      with: {
        user: true,
        mentor: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [asc(schema.mentees.id)],
    });

    const result: MenteeWithDetails[] = [];

    for (const mentee of mentees) {
      // Calculate average attendance
      const records = await db.query.academicRecords.findMany({
        where: eq(schema.academicRecords.menteeId, mentee.id),
      });

      const attendance = records.length
        ? records.reduce((sum, record) => sum + (record.attendance || 0), 0) / records.length
        : undefined;

      result.push({
        ...mentee,
        name: mentee.user?.name,
        email: mentee.user?.email,
        attendance,
        mentorName: mentee.mentor?.user?.name,
      });
    }

    return result;
  }

  async getMenteesByMentor(mentorId: number): Promise<MenteeWithDetails[]> {
    const mentees = await db.query.mentees.findMany({
      where: and(
        eq(schema.mentees.mentorId, mentorId),
        eq(schema.mentees.isActive, true)
      ),
      with: {
        user: true,
      },
      orderBy: [asc(schema.mentees.id)],
    });

    const result: MenteeWithDetails[] = [];

    for (const mentee of mentees) {
      // Calculate average attendance
      const records = await db.query.academicRecords.findMany({
        where: eq(schema.academicRecords.menteeId, mentee.id),
      });

      const attendance = records.length
        ? records.reduce((sum, record) => sum + (record.attendance || 0), 0) / records.length
        : undefined;

      result.push({
        ...mentee,
        name: mentee.user?.name,
        email: mentee.user?.email,
        attendance,
      });
    }

    return result;
  }

  async createMentee(mentee: Omit<schema.InsertMentee, "id">): Promise<schema.Mentee> {
    const [newMentee] = await db.insert(schema.mentees).values(mentee).returning();
    return newMentee;
  }

  async updateMentee(id: number, menteeData: Partial<schema.InsertMentee>): Promise<schema.Mentee> {
    const [updatedMentee] = await db
      .update(schema.mentees)
      .set({
        ...menteeData,
        updatedAt: new Date(),
      })
      .where(eq(schema.mentees.id, id))
      .returning();

    if (!updatedMentee) {
      throw new Error(`Mentee with ID ${id} not found`);
    }

    return updatedMentee;
  }

  async deleteMentee(id: number): Promise<void> {
    await db.delete(schema.mentees).where(eq(schema.mentees.id, id));
  }

  async countMentees(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.mentees)
      .where(eq(schema.mentees.isActive, true));

    return result[0]?.count || 0;
  }

  async countMenteesByMentor(mentorId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.mentees)
      .where(
        and(
          eq(schema.mentees.mentorId, mentorId),
          eq(schema.mentees.isActive, true)
        )
      );

    return result[0]?.count || 0;
  }

  async reassignMentees(fromMentorId: number): Promise<void> {
    // Get mentees to reassign
    const mentees = await db.query.mentees.findMany({
      where: and(
        eq(schema.mentees.mentorId, fromMentorId),
        eq(schema.mentees.isActive, true)
      ),
    });

    if (mentees.length === 0) return;

    // Get available mentors
    const mentors = await db.query.mentors.findMany({
      where: and(
        eq(schema.mentors.isActive, true),
      ),
    });

    // Remove the mentor we're reassigning from
    const availableMentors = mentors.filter(m => m.id !== fromMentorId);

    if (availableMentors.length === 0) {
      // No mentors available, set mentorId to null
      for (const mentee of mentees) {
        await db
          .update(schema.mentees)
          .set({ mentorId: null, updatedAt: new Date() })
          .where(eq(schema.mentees.id, mentee.id));
      }
      return;
    }

    // Group mentees by semester
    const bySemester: Record<number, schema.Mentee[]> = {};
    for (const mentee of mentees) {
      if (!bySemester[mentee.semester]) {
        bySemester[mentee.semester] = [];
      }
      bySemester[mentee.semester].push(mentee);
    }

    // For each semester group, assign mentees evenly among mentors
    for (const semester in bySemester) {
      const semesterMentees = bySemester[semester];
      
      // Get current mentee counts for each mentor
      const mentorMenteeCounts: Record<number, number> = {};
      for (const mentor of availableMentors) {
        mentorMenteeCounts[mentor.id] = await this.countMenteesByMentor(mentor.id);
      }

      // Reassign each mentee to the mentor with the fewest mentees
      for (const mentee of semesterMentees) {
        // Find mentor with fewest mentees
        const mentorEntries = Object.entries(mentorMenteeCounts);
        mentorEntries.sort((a, b) => a[1] - b[1]);
        const [mentorId, count] = mentorEntries[0];

        // Update mentee
        await db
          .update(schema.mentees)
          .set({ 
            mentorId: parseInt(mentorId), 
            updatedAt: new Date() 
          })
          .where(eq(schema.mentees.id, mentee.id));

        // Update count for this mentor
        mentorMenteeCounts[parseInt(mentorId)]++;
      }
    }
  }

  // Academic record operations
  async getAcademicRecord(
    menteeId: number,
    subjectId: number,
    semester: number,
    academicYear: string
  ): Promise<schema.AcademicRecord | undefined> {
    return await db.query.academicRecords.findFirst({
      where: and(
        eq(schema.academicRecords.menteeId, menteeId),
        eq(schema.academicRecords.subjectId, subjectId),
        eq(schema.academicRecords.semester, semester),
        eq(schema.academicRecords.academicYear, academicYear)
      ),
    });
  }

  async getAcademicRecordsByMentee(menteeId: number): Promise<schema.AcademicRecord[]> {
    return await db.query.academicRecords.findMany({
      where: eq(schema.academicRecords.menteeId, menteeId),
      with: {
        subject: true,
      },
      orderBy: [asc(schema.academicRecords.semester), asc(schema.academicRecords.subjectId)],
    });
  }

  async createAcademicRecord(record: Omit<schema.InsertAcademicRecord, "id">): Promise<schema.AcademicRecord> {
    const [newRecord] = await db.insert(schema.academicRecords).values(record).returning();
    return newRecord;
  }

  async updateAcademicRecord(id: number, recordData: Partial<schema.InsertAcademicRecord>): Promise<schema.AcademicRecord> {
    const [updatedRecord] = await db
      .update(schema.academicRecords)
      .set({
        ...recordData,
        updatedAt: new Date(),
      })
      .where(eq(schema.academicRecords.id, id))
      .returning();

    if (!updatedRecord) {
      throw new Error(`Academic record with ID ${id} not found`);
    }

    return updatedRecord;
  }

  async deleteAcademicRecord(id: number): Promise<void> {
    await db.delete(schema.academicRecords).where(eq(schema.academicRecords.id, id));
  }

  // At-risk student operations
  async getAtRiskMentees(): Promise<MenteeWithDetails[]> {
    // First get all mentees
    const allMentees = await this.getAllMenteesWithDetails();
    
    // Filter to only those with attendance below 85%
    return allMentees.filter(mentee => 
      mentee.attendance !== undefined && mentee.attendance < 85
    );
  }

  async getAtRiskMenteesByMentor(mentorId: number): Promise<MenteeWithDetails[]> {
    // First get all mentees for this mentor
    const mentorMentees = await this.getMenteesByMentor(mentorId);
    
    // Filter to only those with attendance below 85%
    return mentorMentees.filter(mentee => 
      mentee.attendance !== undefined && mentee.attendance < 85
    );
  }

  async countAtRiskMentees(): Promise<number> {
    const atRiskMentees = await this.getAtRiskMentees();
    return atRiskMentees.length;
  }

  async countAtRiskMenteesByMentor(mentorId: number): Promise<number> {
    const atRiskMentees = await this.getAtRiskMenteesByMentor(mentorId);
    return atRiskMentees.length;
  }

  // Subject operations
  async getAllSubjects(): Promise<schema.Subject[]> {
    return await db.query.subjects.findMany({
      orderBy: [asc(schema.subjects.semester), asc(schema.subjects.name)],
    });
  }

  // Error log operations
  async createErrorLog(log: Omit<schema.InsertErrorLog, "id">): Promise<schema.ErrorLog> {
    const [newLog] = await db.insert(schema.errorLogs).values(log).returning();
    return newLog;
  }

  async getErrorLogs(): Promise<schema.ErrorLog[]> {
    return await db.query.errorLogs.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(schema.errorLogs.createdAt)],
    });
  }

  // Analytics operations
  async getAverageAttendanceByMentor(mentorId: number): Promise<number> {
    const mentees = await this.getMenteesByMentor(mentorId);
    
    // If no mentees, return 0
    if (mentees.length === 0) return 0;
    
    // Calculate average of mentee attendance averages
    const totalAttendance = mentees.reduce((sum, mentee) => sum + (mentee.attendance || 0), 0);
    const menteeCount = mentees.filter(m => m.attendance !== undefined).length;
    
    return menteeCount > 0 ? totalAttendance / menteeCount : 0;
  }

  async getMenteeSemesterDistribution(mentorId: number): Promise<Record<number, number>> {
    const mentees = await this.getMenteesByMentor(mentorId);
    
    // Initialize distribution object with 0 for semesters 1-8
    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 8; i++) {
      distribution[i] = 0;
    }
    
    // Count mentees by semester
    for (const mentee of mentees) {
      if (mentee.semester && mentee.semester >= 1 && mentee.semester <= 8) {
        distribution[mentee.semester]++;
      }
    }
    
    return distribution;
  }
}

export const storage = new DatabaseStorage();
