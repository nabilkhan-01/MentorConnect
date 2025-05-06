import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, or, asc, desc, lt, gt, sql, count, avg } from "drizzle-orm";
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
  assignMenteesToMentors: () => Promise<{assignedCount: number, mentorCount: number}>;
  
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
  
  // Self-assessment operations
  getSelfAssessmentsByMentee: (menteeId: number) => Promise<schema.SelfAssessment[]>;
  createSelfAssessment: (assessment: Omit<schema.InsertSelfAssessment, "id">) => Promise<schema.SelfAssessment>;
  
  // Message operations
  getMessagesByUser: (userId: number) => Promise<(schema.Message & { sender: schema.User })[]>;
  createMessage: (message: Omit<schema.InsertMessage, "id">) => Promise<schema.Message>;
  markMessageAsRead: (messageId: number) => Promise<void>;
  
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
    
    // Create a map of mentor loads and semester distribution
    const mentorLoadMap: Record<number, {
      totalCount: number, 
      semesterCounts: Record<number, number>
    }> = {};
    
    // Initialize load map for all available mentors
    for (const mentor of availableMentors) {
      mentorLoadMap[mentor.id] = {
        totalCount: 0,
        semesterCounts: {}
      };
    }
    
    // Get all current mentees to calculate mentor loads
    const allMentees = await db.query.mentees.findMany({
      where: eq(schema.mentees.isActive, true)
    });
    
    // Calculate current mentee distribution across mentors
    for (const mentee of allMentees) {
      // Skip the mentees being reassigned
      if (mentee.mentorId === fromMentorId) continue;
      
      // Skip unassigned mentees
      if (!mentee.mentorId || !mentorLoadMap[mentee.mentorId]) continue;
      
      // Update total mentee count for this mentor
      mentorLoadMap[mentee.mentorId].totalCount++;
      
      // Update semester count for this mentor
      if (!mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester]) {
        mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester] = 0;
      }
      mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester]++;
    }

    // Group mentees by semester
    const bySemester: Record<number, schema.Mentee[]> = {};
    for (const mentee of mentees) {
      if (!bySemester[mentee.semester]) {
        bySemester[mentee.semester] = [];
      }
      bySemester[mentee.semester].push(mentee);
    }

    // Log the reassignment plan
    const reassignments: Array<{menteeId: number, fromMentorId: number, toMentorId: number, semester: number}> = [];
    
    // For each semester group, assign mentees evenly among mentors
    for (const semester in bySemester) {
      const semesterMentees = bySemester[semester];
      
      // Process each mentee in this semester group
      for (const mentee of semesterMentees) {
        // First, try to find mentors who don't have any mentees from this semester
        const semesterNeededMentors = availableMentors.filter(mentor => {
          return !mentorLoadMap[mentor.id].semesterCounts[parseInt(semester)];
        });
        
        let targetMentorId: number;
        
        if (semesterNeededMentors.length > 0) {
          // Sort by total load (assign to least loaded mentor)
          semesterNeededMentors.sort((a, b) => 
            mentorLoadMap[a.id].totalCount - mentorLoadMap[b.id].totalCount
          );
          targetMentorId = semesterNeededMentors[0].id;
        } else {
          // All mentors already have mentees from this semester
          // Simply assign to the mentor with the fewest mentees
          const sortedMentors = [...availableMentors].sort((a, b) => 
            mentorLoadMap[a.id].totalCount - mentorLoadMap[b.id].totalCount
          );
          targetMentorId = sortedMentors[0].id;
        }
        
        // Update mentee
        await db
          .update(schema.mentees)
          .set({ 
            mentorId: targetMentorId, 
            updatedAt: new Date() 
          })
          .where(eq(schema.mentees.id, mentee.id));
        
        // Update our load tracking
        mentorLoadMap[targetMentorId].totalCount++;
        if (!mentorLoadMap[targetMentorId].semesterCounts[parseInt(semester)]) {
          mentorLoadMap[targetMentorId].semesterCounts[parseInt(semester)] = 0;
        }
        mentorLoadMap[targetMentorId].semesterCounts[parseInt(semester)]++;
        
        // Record this reassignment for logging
        reassignments.push({
          menteeId: mentee.id,
          fromMentorId: fromMentorId,
          toMentorId: targetMentorId,
          semester: parseInt(semester)
        });
      }
    }
    
    // Create a notification about reassignments
    if (reassignments.length > 0) {
      const message = `${reassignments.length} mentee(s) were automatically reassigned to new mentors.`;
      
      await db
        .insert(schema.notifications)
        .values({
          message: message,
          targetRoles: [schema.UserRole.ADMIN, schema.UserRole.MENTOR],
          isUrgent: true
        });
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
  
  async getSubjectsBySemester(semester: number): Promise<schema.Subject[]> {
    return await db.query.subjects.findMany({
      where: eq(schema.subjects.semester, semester),
      orderBy: [asc(schema.subjects.name)],
    });
  }
  
  async getSubject(id: number): Promise<schema.Subject | undefined> {
    return await db.query.subjects.findFirst({
      where: eq(schema.subjects.id, id)
    });
  }
  
  async createSubject(subject: Omit<schema.InsertSubject, "id">): Promise<schema.Subject> {
    const [newSubject] = await db.insert(schema.subjects).values(subject).returning();
    return newSubject;
  }
  
  async updateSubject(id: number, subjectData: Partial<schema.InsertSubject>): Promise<schema.Subject> {
    const [updatedSubject] = await db
      .update(schema.subjects)
      .set({
        ...subjectData,
        updatedAt: new Date(),
      })
      .where(eq(schema.subjects.id, id))
      .returning();
    
    if (!updatedSubject) {
      throw new Error(`Subject with ID ${id} not found`);
    }
    
    return updatedSubject;
  }
  
  async deleteSubject(id: number): Promise<void> {
    // First check if this subject is used in any academic records
    const academicRecords = await db.query.academicRecords.findMany({
      where: eq(schema.academicRecords.subjectId, id),
      limit: 1
    });
    
    if (academicRecords.length > 0) {
      throw new Error("Cannot delete subject that is used in academic records");
    }
    
    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
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

  // Self-assessment operations
  async getSelfAssessmentsByMentee(menteeId: number): Promise<schema.SelfAssessment[]> {
    return await db.query.selfAssessments.findMany({
      where: eq(schema.selfAssessments.menteeId, menteeId),
      orderBy: [desc(schema.selfAssessments.createdAt)],
    });
  }

  async createSelfAssessment(assessment: Omit<schema.InsertSelfAssessment, "id">): Promise<schema.SelfAssessment> {
    const [newAssessment] = await db.insert(schema.selfAssessments).values(assessment).returning();
    return newAssessment;
  }

  // Message operations
  async getMessagesByUser(userId: number): Promise<(schema.Message & { sender: schema.User })[]> {
    const messages = await db.query.messages.findMany({
      where: or(
        eq(schema.messages.senderId, userId),
        eq(schema.messages.receiverId, userId)
      ),
      with: {
        sender: true,
      },
      orderBy: [asc(schema.messages.createdAt)],
    });

    return messages;
  }

  async createMessage(message: Omit<schema.InsertMessage, "id">): Promise<schema.Message> {
    const [newMessage] = await db.insert(schema.messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(schema.messages)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.messages.id, messageId));
  }
}

export const storage = new DatabaseStorage();
