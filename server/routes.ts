import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import { db } from "../db";
import multer from "multer";
import * as xlsx from "xlsx";
import { eq, and, or, desc, lt, asc } from "drizzle-orm";
import { adminMentorMessagesCacheMiddleware, cacheResponse, invalidateCacheOnWrite } from "./cache-middleware";
import { cacheKeys } from "./cache";
import {
  users,
  mentors,
  mentees,
  academicRecords,
  errorLogs,
  subjects,
  selfAssessments,
  messages,
  notifications,
  UserRole,
  MeetingType,
  MeetingStatus,
  insertSelfAssessmentSchema,
  insertMessageSchema,
  insertNotificationSchema,
} from "@shared/schema";
import * as schema from "@shared/schema";
import * as XLSX from 'xlsx';

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // API Middleware to check if user is authenticated
  const authenticateUser = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // API Middleware to check if user has admin role
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  };

  // API Middleware to check if user has mentor role
  const requireMentor = (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ message: "Forbidden: Mentor access required" });
    }
    next();
  };

  // API Middleware to check if user has mentee role
  const requireMentee = (req: any, res: any, next: any) => {
    if (req.user.role !== UserRole.MENTEE) {
      return res.status(403).json({ message: "Forbidden: Mentee access required" });
    }
    next();
  };

  // Log error
  const logError = async (userId: number | null, action: string, errorMessage: string, stackTrace?: string) => {
    try {
      await storage.createErrorLog({
        userId,
        action,
        errorMessage,
        stackTrace,
      });
    } catch (error) {
      console.error("Failed to log error:", error);
    }
  };

  // ---------- USER ROUTES ----------

  // Update user profile
  app.patch("/api/user/:id/profile", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Ensure user can only update their own profile unless they are an admin
      if (!req.user || (req.user.id !== userId && req.user.role !== UserRole.ADMIN)) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      const { name, email, mobileNumber } = req.body;
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, {
        name,
        email,
      });
      
      // Update mobile number in mentor or mentee record if applicable
      if (mobileNumber) {
        if (updatedUser.role === UserRole.MENTOR) {
          const mentor = await storage.getMentorByUserId(userId);
          if (mentor) {
            await storage.updateMentor(mentor.id, {
              mobileNumber,
            });
          }
        } else if (updatedUser.role === UserRole.MENTEE) {
          const mentee = await storage.getMenteeByUserId(userId);
          if (mentee) {
            await storage.updateMentee(mentee.id, {
              mobileNumber,
            });
          }
        }
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_profile", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Change password
  app.post("/api/user/:id/change-password", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Ensure user can only update their own password
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "You can only change your own password" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Get current user with password
      const user = await storage.getUser(userId);
      
      // Check if current password is correct
      const isValid = await comparePasswords(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(userId, {
        password: hashedPassword,
      });
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "change_password", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update notification settings
  app.post("/api/user/:id/notification-settings", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Ensure user can only update their own notification settings
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "You can only update your own notification settings" });
      }
      
      // Mock response as we don't have a notification settings table yet
      res.json({
        message: "Notification settings updated successfully",
        settings: req.body,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_notification_settings", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get notifications for the current user
  app.get("/api/notifications", authenticateUser, async (req, res) => {
    try {
      // Get user role
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userRole = req.user.role;
      const currentUserId = req.user.id;
      
      // Get notifications from the database
      const allNotifications = await db.query.notifications.findMany({
        orderBy: [desc(notifications.createdAt)],
      });
      
      // Filter notifications by user role
      // Note: We're doing this in memory since JSON column filtering
      // is complex in SQL and varies by database platform
      const userNotifications = allNotifications.filter(notification => {
        // If notification has a specific target user, only show to that user
        if (notification.targetUserId) {
          return notification.targetUserId === currentUserId;
        }
        
        // Otherwise, use role-based filtering
        if (!notification.targetRoles) return false;
        
        try {
          const roles = notification.targetRoles as string[];
          return roles.includes(userRole) || roles.includes('all');
        } catch (err) {
          return false;
        }
      });
      
      // Return the filtered notifications
      res.json(userNotifications);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_notifications", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Mark notification as read
  app.post("/api/notifications/:id/read", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const notificationId = parseInt(id);
      
      // Update the notification in the database
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
      
      res.json({ message: "Notification marked as read" });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "mark_notification_read", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const notificationId = parseInt(id);
      
      console.log(`[DEBUG] Deleting notification ID: ${notificationId}`);
      
      // Check if notification exists
      const notification = await db.query.notifications.findFirst({
        where: eq(notifications.id, notificationId),
      });
      
      if (!notification) {
        console.log(`[DEBUG] Notification with ID ${notificationId} not found`);
        return res.status(404).json({ message: "Notification not found" });
      }
      
      console.log(`[DEBUG] Notification found, deleting: ${notificationId}`);
      
      // Delete the notification
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      
      console.log(`[DEBUG] Notification ${notificationId} deleted successfully`);
      
      res.json({ message: "Notification deleted successfully" });
    } catch (error: any) {
      console.error(`[DEBUG] Error deleting notification ${req.params.id}:`, error);
      await logError(req.user?.id ?? null, "delete_notification", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create a new notification (admin only)
app.post("/api/notifications", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { message, targetRoles, isUrgent } = req.body;

    // Ensure targetRoles is properly handled as a valid string[]
    let roles: string[] = [];

    if (Array.isArray(targetRoles)) {
      roles = targetRoles.map((r: any) => String(r));
    } else if (typeof targetRoles === "string") {
      try {
        const parsed = JSON.parse(targetRoles);
        if (Array.isArray(parsed)) {
          roles = parsed.map((r: any) => String(r));
        } else {
          roles = [String(parsed)];
        }
      } catch {
        roles = [targetRoles]; // Treat plain string as one role
      }
    } else {
      return res.status(400).json({ message: "Invalid targetRoles format" });
    }

    // ✅ Ensure `roles` is a real string[]
    if (!Array.isArray(roles) || !roles.every(r => typeof r === "string")) {
      return res.status(400).json({ message: "targetRoles must be an array of strings" });
    }

    const parsedData = {
      message,
      targetRoles: roles,
      isUrgent: Boolean(isUrgent),
      isRead: false,
      createdAt: new Date(),
    };

    // Validate using Zod schema
    const parsed = insertNotificationSchema.parse(parsedData);

    // Insert into database
    const [newNotification] = await db.insert(notifications)
      .values({ 
        ...parsed, 
        targetRoles: Array.isArray(parsed.targetRoles) 
          ? [...parsed.targetRoles] 
          : [String(parsed.targetRoles)] 
      })
      .returning();

    res.status(201).json(newNotification);
  } catch (error: any) {
    await logError(req.user?.id ?? null, "create_notification", error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
});

  // ---------- MEETINGS ROUTES ----------

  // List meetings for current user
  app.get("/api/meetings", authenticateUser, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      if (req.user.role === UserRole.MENTOR) {
        const mentorRecord = await storage.getMentorByUserId(req.user.id);
        if (!mentorRecord) return res.status(404).json({ message: "Mentor profile not found" });
        const meetings = await storage.getMeetingsByMentor(mentorRecord.id);
        return res.json(meetings);
      }

      if (req.user.role === UserRole.MENTEE) {
        const menteeRecord = await storage.getMenteeByUserId(req.user.id);
        if (!menteeRecord) return res.status(404).json({ message: "Mentee profile not found" });
        const meetings = await storage.getMeetingsByMentee(menteeRecord.id);
        return res.json(meetings);
      }

      // Admins receive empty here; use admin endpoint
      return res.json([]);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "list_meetings", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a meeting (mentor only)
  app.post("/api/meetings", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) return res.status(404).json({ message: "Mentor profile not found" });

      const { title, description, location, scheduledAt, durationMinutes, type, menteeIds } = req.body;
      if (!Array.isArray(menteeIds) || menteeIds.length === 0) {
        return res.status(400).json({ message: "Select at least one mentee" });
      }

      // Enforce type constraints
      if (type === MeetingType.ONE_TO_ONE && menteeIds.length !== 1) {
        return res.status(400).json({ message: "One-to-one meeting must have exactly one mentee" });
      }
      if (type === MeetingType.MANY_TO_ONE && menteeIds.length < 2) {
        return res.status(400).json({ message: "Many-to-one meeting must have at least two mentees" });
      }

      // Verify mentees belong to this mentor
      const myMentees = await storage.getMenteesByMentor(mentorRecord.id);
      const myMenteeIds = new Set(myMentees.map((m: any) => m.id));
      for (const id of menteeIds) {
        if (!myMenteeIds.has(Number(id))) {
          return res.status(403).json({ message: "You can only schedule meetings for your mentees" });
        }
      }

      const parsed = schema.insertMeetingSchema.parse({
        mentorId: mentorRecord.id,
        title,
        description,
        location,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: Number(durationMinutes ?? 60),
        type,
        status: MeetingStatus.SCHEDULED,
      });

      const created = await storage.createMeetingWithParticipants(parsed, menteeIds.map((x: any) => Number(x)));
      res.status(201).json(created);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "create_meeting", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Submit attendance/remarks/stars (mentor only)
  app.patch("/api/meetings/:id/feedback", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const meetingId = Number(req.params.id);
      const { updates, complete } = req.body as { updates: Array<{ menteeId: number; attended: boolean; remarks?: string; stars?: number }>; complete?: boolean };
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Provide feedback updates" });
      }

      // Verify ownership
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) return res.status(404).json({ message: "Mentor profile not found" });
      const meetings = await storage.getMeetingsByMentor(mentorRecord.id);
      const target = meetings.find((m: any) => m.id === meetingId);
      if (!target) return res.status(404).json({ message: "Meeting not found" });

      // Ensure menteeIds are participants
      const participantIds = new Set((target.participants || []).map((p: any) => p.menteeId));
      for (const u of updates) {
        if (!participantIds.has(Number(u.menteeId))) {
          return res.status(400).json({ message: `Mentee ${u.menteeId} is not a participant of this meeting` });
        }
      }

      await storage.updateMeetingFeedback(meetingId, updates.map(u => ({
        menteeId: Number(u.menteeId),
        attended: Boolean(u.attended),
        remarks: u.remarks ?? null,
        stars: u.stars ?? null,
      })), Boolean(complete));

      res.json({ message: "Feedback saved" });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_meeting_feedback", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin list of all meetings
  app.get("/api/admin/meetings", authenticateUser, requireAdmin, async (_req, res) => {
    try {
      const all = await storage.getAllMeetingsWithParticipants();
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  // ---------- ADMIN ROUTES ----------

  // Get dashboard stats
  app.get("/api/admin/dashboard/stats", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const totalStudents = await storage.countMentees();
      const totalMentors = await storage.countMentors();
      const avgMenteesPerMentor = totalMentors > 0 ? totalStudents / totalMentors : 0;
      const atRiskStudents = await storage.countAtRiskMentees();

      res.json({
        totalStudents,
        totalMentors,
        avgMenteesPerMentor,
        atRiskStudents,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_dashboard_stats", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get at-risk students (attendance < 85%)
  app.get("/api/admin/at-risk-students", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const atRiskStudents = await storage.getAtRiskMentees();
      res.json(atRiskStudents);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_at_risk_students", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get recent activities
  app.get("/api/admin/activities", authenticateUser, requireAdmin, async (req, res) => {
    try {
      // Get recent notifications as activities
      const recentNotifications = await db.query.notifications.findMany({
        orderBy: [desc(notifications.createdAt)],
        limit: 10,
      });

      // Convert notifications to activities format
      const activities = recentNotifications.map((notification, index) => ({
        id: notification.id,
        type: notification.isUrgent ? "warning" : "info",
        description: notification.message,
        timestamp: notification.createdAt.toISOString(),
      }));
      res.json(activities);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_activities", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all students
  app.get("/api/admin/students", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const students = await storage.getAllMenteesWithDetails();
      res.json(students);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_all_students", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Add a student
  app.post("/api/admin/students", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { name, email, usn, semester, section, mobileNumber, parentMobileNumber, mentorId } = req.body;

      // Create user account first
      const username = usn.toLowerCase(); // Use USN as username
      const user = await storage.createUser({
        username,
        password: await hashPassword(username), // Default password same as username, properly hashed
        role: UserRole.MENTEE,
        name,
        email,
      });

      // Then create mentee record
      const mentee = await storage.createMentee({
        userId: user.id,
        usn,
        semester,
        section,
        mentorId,
        mobileNumber,
        parentMobileNumber,
      });

      res.status(201).json({
        ...mentee,
        name,
        email,
        username,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "add_student", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a student
  app.put("/api/admin/students/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, usn, semester, section, mobileNumber, parentMobileNumber, mentorId } = req.body;

      // Get existing mentee
      const mentee = await storage.getMentee(parseInt(id));
      if (!mentee) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Update user info
      await storage.updateUser(mentee.userId, {
        name,
        email,
      });

      // Update mentee info
      const updatedMentee = await storage.updateMentee(parseInt(id), {
        usn,
        semester,
        section,
        mentorId,
        mobileNumber,
        parentMobileNumber,
      });

      // Create notification for the mentee about their updated profile
      const menteeUser = await storage.getUser(mentee.userId);
      if (menteeUser) {
        console.log(`Creating profile update notification for mentee ${menteeUser.name}`);
        
        await db.insert(notifications).values({
          message: `Your profile information has been updated by the administrator. Please review your details in the profile section.`,
          targetRoles: ['mentee'],
          isUrgent: false,
        });
        
        // Also create a notification for the admin to confirm the action
        await db.insert(notifications).values({
          message: `You have updated profile information for ${menteeUser.name} (${usn}).`,
          targetRoles: ['admin'],
          isUrgent: false,
        });
        
        console.log(`Profile update notifications created for ${menteeUser.name}`);
      }

      res.json({
        ...updatedMentee,
        name,
        email,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_student", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a student
  app.delete("/api/admin/students/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const mentee = await storage.getMentee(parseInt(id));
      
      if (!mentee) {
        return res.status(404).json({ message: "Student not found" });
      }

      console.log(`[DEBUG] Starting deletion of mentee ID: ${id}, User ID: ${mentee.userId}`);

      // Import database and schema for direct operations
      const { db } = await import("@db");
      const { academicRecords, messages, errorLogs, selfAssessments, mentees } = await import("@shared/schema");

      // Delete all related records first (in correct order to avoid FK constraints)
      
      // 1. Delete academic records
      console.log(`[DEBUG] Deleting academic records for mentee ID: ${id}`);
      await db.delete(academicRecords).where(eq(academicRecords.menteeId, parseInt(id)));
      
      // 2. Delete self assessments
      console.log(`[DEBUG] Deleting self assessments for mentee ID: ${id}`);
      await db.delete(selfAssessments).where(eq(selfAssessments.menteeId, parseInt(id)));
      
      // 3. Delete messages where user is sender or receiver
      console.log(`[DEBUG] Deleting messages for user ID: ${mentee.userId}`);
      await db.delete(messages).where(
        or(eq(messages.senderId, mentee.userId), eq(messages.receiverId, mentee.userId))
      );
      
      // 4. Delete error logs
      console.log(`[DEBUG] Deleting error logs for user ID: ${mentee.userId}`);
      await db.delete(errorLogs).where(eq(errorLogs.userId, mentee.userId));

      // 5. Delete mentee record (this will automatically remove mentor relationship)
      console.log(`[DEBUG] Deleting mentee record ID: ${id}`);
      await db.delete(mentees).where(eq(mentees.id, parseInt(id)));
      
      // 6. Delete user account
      console.log(`[DEBUG] Deleting user account ID: ${mentee.userId}`);
      await storage.deleteUser(mentee.userId);

      console.log(`[DEBUG] Successfully deleted mentee ID: ${id}`);
      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error: any) {
      console.error(`[DEBUG] Error deleting mentee ID: ${req.params.id}`, error);
      await logError(req.user?.id ?? null, "delete_student", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload students via Excel
  app.post("/api/admin/upload-students", authenticateUser, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const assignmentMethod = req.body.assignmentMethod || "equal";
      
      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Validate data
      if (!data.length) {
        return res.status(400).json({ message: "Excel file is empty" });
      }

      // Get all mentors for assignment
      const mentorsList = await storage.getAllMentors();
      if (!mentorsList.length) {
        return res.status(400).json({ message: "No mentors available for assignment" });
      }

      // Process each student
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < data.length; i++) {
        const student = data[i] as any;
        try {
          // Basic validation
          if (!student.name || !student.usn || !student.semester || !student.section) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Missing required fields`);
            continue;
          }

          // Check if student already exists
          const existingMentee = await storage.getMenteeByUsn(student.usn);
          if (existingMentee) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Student with USN ${student.usn} already exists`);
            continue;
          }

          // Assign mentor based on method
          let mentorId;
          
          if (assignmentMethod === "equal") {
            // Simple round-robin assignment
            mentorId = mentorsList[i % mentorsList.length].id;
          } else if (assignmentMethod === "semester") {
            // Group by semester
            const semesterMentors = mentorsList.filter((m, index) => index % 8 === (student.semester - 1) % 8);
            mentorId = semesterMentors.length > 0 
              ? semesterMentors[Math.floor(Math.random() * semesterMentors.length)].id
              : mentorsList[Math.floor(Math.random() * mentorsList.length)].id;
          } else if (assignmentMethod === "balanced") {
            // Advanced balanced assignment: distribute mentees evenly across mentors
            // while ensuring mentors have mentees from all semesters
            
            // Get current mentee counts for each mentor
            const mentorLoadMap: Record<number, {count: number, semesterCounts: Record<number, number>}> = {};
            
            // Initialize the load map
            for (const mentor of mentorsList) {
              mentorLoadMap[mentor.id] = {
                count: 0,
                semesterCounts: {}
              };
            }
            
            // Get all current mentees to calculate load
            const allMentees = await storage.getAllMentees();
            
            // Count mentees per mentor and by semester
            for (const mentee of allMentees) {
              if (mentee.mentorId && mentorLoadMap[mentee.mentorId]) {
                mentorLoadMap[mentee.mentorId].count++;
                
                if (!mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester]) {
                  mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester] = 0;
                }
                mentorLoadMap[mentee.mentorId].semesterCounts[mentee.semester]++;
              }
            }
            
            // First, try to assign to a mentor who doesn't have mentees from this semester
            const semesterNeededMentors = mentorsList.filter(mentor => {
              return !mentorLoadMap[mentor.id].semesterCounts[student.semester];
            });
            
            if (semesterNeededMentors.length > 0) {
              // Sort by total load (assign to least loaded mentor)
              semesterNeededMentors.sort((a, b) => 
                mentorLoadMap[a.id].count - mentorLoadMap[b.id].count
              );
              mentorId = semesterNeededMentors[0].id;
            } else {
              // All mentors already have mentees from this semester
              // Simply assign to the mentor with the fewest mentees
              const sortedMentors = [...mentorsList].sort((a, b) => 
                mentorLoadMap[a.id].count - mentorLoadMap[b.id].count
              );
              mentorId = sortedMentors[0].id;
            }
          } else {
            // For manual, just leave it null
            mentorId = null;
          }

          // Create user
          const username = student.usn.toLowerCase();
          const user = await storage.createUser({
            username,
            password: await hashPassword(username), // Default password same as username, properly hashed
            role: UserRole.MENTEE,
            name: student.name,
            email: student.email,
          });

          // Create mentee
          await storage.createMentee({
            userId: user.id,
            usn: student.usn,
            semester: parseInt(student.semester),
            section: student.section,
            mentorId,
            mobileNumber: student.mobileNumber,
            parentMobileNumber: student.parentMobileNumber,
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
          await logError(req.user?.id ?? null, "upload_student", `Error processing row ${i + 2}: ${error.message}`, error.stack);
        }
      }

      // Log results
      if (results.failed > 0) {
        await logError(
          req.user?.id ?? null,
          "upload_students_partial",
          `${results.success} students imported successfully, ${results.failed} failed`,
          results.errors.join('\n')
        );
      }

      res.json({
        message: `${results.success} students imported successfully, ${results.failed} failed`,
        results,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "upload_students", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Run the balanced assignment of mentees to mentors
  app.post("/api/admin/mentees/assign", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const result = await storage.assignMenteesToMentors();
      
      if (result.assignedCount === 0) {
        return res.json({
          success: true,
          message: "No unassigned mentees found. All mentees are already assigned to mentors.",
          result
        });
      }
      
      res.json({
        success: true,
        message: `Successfully assigned ${result.assignedCount} mentees to ${result.mentorCount} mentors with balanced distribution across semesters.`,
        result
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "assign_mentees", error.message, error.stack);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  });

  // Get all mentors
  app.get("/api/mentors", authenticateUser, async (req, res) => {
    try {
      const mentors = await storage.getAllMentorsWithDetails();
      res.json(mentors);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_all_mentors", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentor by ID
  app.get("/api/mentors/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const mentor = await storage.getMentorWithDetails(parseInt(id));
      
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      res.json(mentor);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentees for a specific mentor
  app.get("/api/mentors/:id/mentees", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const mentorId = parseInt(id);
      
      console.log(`[DEBUG] Getting mentees for mentor ID: ${mentorId}`);
      
      // Check if mentor exists
      const mentor = await storage.getMentor(mentorId);
      if (!mentor) {
        console.log(`[DEBUG] Mentor with ID ${mentorId} not found`);
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      console.log(`[DEBUG] Mentor found: ${mentor.id}`);
      
      // Get mentees for this mentor
      const mentees = await storage.getMenteesByMentor(mentorId);
      
      console.log(`[DEBUG] Found ${mentees.length} mentees for mentor ${mentorId}`);
      
      res.json(mentees);
    } catch (error: any) {
      console.error(`[DEBUG] Error getting mentees for mentor ${req.params.id}:`, error);
      await logError(req.user?.id ?? null, "get_mentor_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Add a mentor
  app.post("/api/admin/mentors", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { name, email, department, specialization, mobileNumber } = req.body;

      // Create username from email or name
      // Build username from full name consistently: "Ms Alakananda K" -> "ms.alakananda.k"
      const nameParts = String(name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      const fromName = nameParts
        .map(p => p.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
        .join('.');
      const fromEmail = (email ? email.split('@')[0] : '').toLowerCase().replace(/[^a-z0-9.]/g, '');
      // Prefer full-name-based usernames for consistency; fallback to email local-part
      const baseUsername = (fromName || fromEmail || 'mentor');

      // If a user already exists with this username, attach mentor profile to that user
      const preExistingUser = await storage.getUserByUsername(baseUsername);
      if (preExistingUser) {
        // If a mentor profile is already linked, return conflict
        const existingMentor = await storage.getMentorByUserId(preExistingUser.id);
        if (existingMentor) {
          return res.status(409).json({ message: "Mentor already exists for this user" });
        }

        // Ensure role is mentor and update basic info
        await storage.updateUser(preExistingUser.id, {
          role: UserRole.MENTOR,
          name,
          email,
        });

        const mentor = await storage.createMentor({
          userId: preExistingUser.id,
          department,
          specialization,
          mobileNumber,
          isActive: true,
        });

        return res.status(201).json({
          ...mentor,
          name: name ?? preExistingUser.name,
          email: email ?? preExistingUser.email,
          username: preExistingUser.username,
        });
      }

      // Ensure unique username for a brand-new user
      let username = baseUsername;
      let suffix = 1;
      while (await storage.getUserByUsername(username)) {
        username = `${baseUsername}${suffix++}`;
      }

      // Create user account first
      const user = await storage.createUser({
        username,
        password: await hashPassword("1234567890"), // Default password set and hashed
        role: UserRole.MENTOR,
        name,
        email,
      });

      // Then create mentor record
      const mentor = await storage.createMentor({
        userId: user.id,
        department,
        specialization,
        mobileNumber,
        isActive: true,
      });

      res.status(201).json({
        ...mentor,
        name,
        email,
        username,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "add_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a mentor
  app.put("/api/admin/mentors/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, department, specialization, mobileNumber, isActive } = req.body;

      // Get existing mentor
      const mentor = await storage.getMentor(parseInt(id));
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }

      // Update user info
      await storage.updateUser(mentor.userId, {
        name,
        email,
      });

      // Update mentor info
      const updatedMentor = await storage.updateMentor(parseInt(id), {
        department,
        specialization,
        mobileNumber,
        isActive,
      });

      // If mentor is deactivated, reassign their mentees
      if (mentor.isActive && !isActive) {
        await storage.reassignMentees(parseInt(id));
      }

      res.json({
        ...updatedMentor,
        name,
        email,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a mentor
  app.delete("/api/admin/mentors/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const mentor = await storage.getMentor(parseInt(id));
      
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }

      // Reassign mentees
      await storage.reassignMentees(parseInt(id));

      // Delete mentor record
      await storage.deleteMentor(parseInt(id));
      
      // Clean up dependent records that reference the user to avoid FK errors
      try {
        const { db } = await import("@db");
        await db.delete(messages).where(
          or(eq(messages.senderId, mentor.userId), eq(messages.receiverId, mentor.userId))
        );
        await db.delete(errorLogs).where(eq(errorLogs.userId, mentor.userId));
      } catch (cleanupErr) {
        // Continue even if cleanup fails; deletion below may still work depending on FKs
        console.warn("Mentor deletion cleanup warning:", cleanupErr);
      }

      // Delete user account
      await storage.deleteUser(mentor.userId);

      res.status(200).json({ message: "Mentor deleted successfully" });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "delete_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get error logs
  app.get("/api/admin/error-logs", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const errorLogsList = await storage.getErrorLogs();
      res.json(errorLogsList);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_error_logs", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // ---------- MENTOR ROUTES ----------

  // Get mentor dashboard stats
  app.get("/api/mentor/dashboard/stats", authenticateUser, async (req, res) => {
    try {
      // Check if req.user exists
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
      }

      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor not found" });
      }

      // Get mentees for this mentor
      const mentees = await storage.getMenteesByMentor(mentorRecord.id);
      
      // Calculate statistics
      const totalMentees = mentees.length;
      const atRiskMentees = mentees.filter(mentee => 
        mentee.attendance !== undefined && mentee.attendance < 85
      ).length;
      
      // Calculate average attendance
      const menteesWithAttendance = mentees.filter(mentee => mentee.attendance !== undefined);
      const averageAttendance = menteesWithAttendance.length > 0
        ? menteesWithAttendance.reduce((sum, mentee) => sum + (mentee.attendance || 0), 0) / menteesWithAttendance.length
        : 0;

      // Calculate semester distribution
      const semesterDistribution: Record<number, number> = {};
      mentees.forEach(mentee => {
        semesterDistribution[mentee.semester] = (semesterDistribution[mentee.semester] || 0) + 1;
      });

      const dashboardStats = {
        mentorId: mentorRecord.id,
        totalMentees,
        atRiskMentees,
        averageAttendance,
        semesterDistribution,
      };

      res.json(dashboardStats);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentor_dashboard_stats", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentor's mentees
  app.get("/api/mentor/mentees", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
      }
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const mentees = await storage.getMenteesByMentor(mentorRecord.id);
      res.json(mentees);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentor_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentor's at-risk mentees
 app.get("/api/mentor/at-risk-mentees", authenticateUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    // Get mentor ID for current user
    const mentorRecord = await storage.getMentorByUserId(req.user.id);
    if (!mentorRecord) {
      return res.status(404).json({ message: "Mentor profile not found" });
    }

    const atRiskMentees = await storage.getAtRiskMenteesByMentor(mentorRecord.id);
    res.json(atRiskMentees);
  } catch (error: any) {
    await logError(req.user?.id ?? null, "get_mentor_at_risk_mentees", error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
});

  // Add a mentee (by mentor)
app.post("/api/mentor/mentees", authenticateUser, requireMentor, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    const { name, email, usn, semester, section, mobileNumber, parentMobileNumber } = req.body;

    // Get mentor ID for current user
    const mentorRecord = await storage.getMentorByUserId(req.user.id);
    if (!mentorRecord) {
      return res.status(404).json({ message: "Mentor profile not found" });
    }

      // Create user account first
      const username = usn.toLowerCase(); // Use USN as username
      const user = await storage.createUser({
        username,
        password: await hashPassword(username), // Default password same as username, properly hashed
        role: UserRole.MENTEE,
        name,
        email,
      });

      // Then create mentee record
      const mentee = await storage.createMentee({
        userId: user.id,
        usn,
        semester,
        section,
        mentorId: mentorRecord.id,
        mobileNumber,
        parentMobileNumber,
      });

      res.status(201).json({
        ...mentee,
        name,
        email,
        username,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "add_mentee_by_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a mentee's academic record
  app.post("/api/mentor/academic-records", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
      const { 
        menteeId, 
        subjectId, 
        cie1Marks, 
        cie2Marks, 
        cie3Marks, 
        assignmentMarks, 
        attendance, 
        semester, 
        academicYear 
      } = req.body;

      // Calculate average CIE marks (out of 30)
      const filledCieMarks = [];
      if (cie1Marks !== undefined && cie1Marks !== null) filledCieMarks.push(Number(cie1Marks));
      if (cie2Marks !== undefined && cie2Marks !== null) filledCieMarks.push(Number(cie2Marks));
      if (cie3Marks !== undefined && cie3Marks !== null) filledCieMarks.push(Number(cie3Marks));
      
      const avgCieMarks = filledCieMarks.length > 0 
        ? filledCieMarks.reduce((sum, mark) => sum + mark, 0) / filledCieMarks.length 
        : null;
      
      // Calculate total marks (average CIE + assignment, out of 50)
      const totalMarks = (avgCieMarks !== null && assignmentMarks !== undefined && assignmentMarks !== null)
        ? avgCieMarks + Number(assignmentMarks)
        : null;

      // Verify mentee belongs to this mentor
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const mentee = await storage.getMentee(menteeId);
      if (!mentee || mentee.mentorId !== mentorRecord.id) {
        return res.status(403).json({ message: "Not authorized to update this mentee's records" });
      }

      // Create or update academic record
      const existingRecord = await storage.getAcademicRecord(menteeId, subjectId, semester, academicYear);
      let academicRecord;

      if (existingRecord) {
        academicRecord = await storage.updateAcademicRecord(existingRecord.id, {
          cie1Marks,
          cie2Marks,
          cie3Marks,
          avgCieMarks,
          assignmentMarks,
          totalMarks,
          attendance,
        });
      } else {
        academicRecord = await storage.createAcademicRecord({
          menteeId,
          subjectId,
          cie1Marks,
          cie2Marks,
          cie3Marks,
          avgCieMarks,
          assignmentMarks,
          totalMarks,
          attendance,
          semester,
          academicYear,
        });
      }

      // Create notification for the mentee about their updated academic record
      const menteeUser = await storage.getUser(mentee.userId);
      if (menteeUser) {
        console.log(`Creating academic record notification for mentee ${menteeUser.name}`);
        
        await db.insert(notifications).values({
          message: `Your academic record has been updated by your mentor. Check your progress in the academic records section.`,
          targetRoles: ['mentee'],
          isUrgent: false,
        });
        
        // Also create a notification for the mentor to confirm the action
        await db.insert(notifications).values({
          message: `You have updated academic records for ${menteeUser.name} (${mentee.usn}).`,
          targetRoles: ['mentor'],
          isUrgent: false,
        });
        
        console.log(`Academic record notifications created for ${menteeUser.name}`);
      }

      res.status(201).json(academicRecord);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_academic_record", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get attendance records for mentor's mentees
  app.get("/api/mentor/attendance-records", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { academicYear } = req.query;
      if (!academicYear) {
        return res.status(400).json({ message: "Academic year is required" });
      }

      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      // Get all mentees for this mentor
      const mentees = await storage.getMenteesByMentor(mentorRecord.id);
      const menteeIds = mentees.map(m => m.id);

      if (menteeIds.length === 0) {
        return res.json([]);
      }

      // Get academic records with attendance for these mentees
      const records = await db.query.academicRecords.findMany({
        where: and(
          eq(schema.academicRecords.academicYear, academicYear as string),
          or(...menteeIds.map(id => eq(schema.academicRecords.menteeId, id)))
        ),
        with: {
          mentee: {
            with: {
              user: true
            }
          },
          subject: true
        }
      });

      // Filter records that have attendance data
      const attendanceRecords = records
        .filter(record => record.attendance !== null)
        .map(record => ({
          id: record.id,
          menteeId: record.menteeId,
          subjectId: record.subjectId,
          attendance: record.attendance,
          semester: record.semester,
          academicYear: record.academicYear,
          mentee: {
            name: record.mentee?.user?.name,
            usn: record.mentee?.usn
          },
          subject: {
            code: record.subject?.code,
            name: record.subject?.name
          }
        }));

      res.json(attendanceRecords);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_attendance_records", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Update attendance for a mentee
  app.post("/api/mentor/attendance", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { 
        menteeId, 
        subjectId, 
        attendance, 
        semester, 
        academicYear 
      } = req.body;

      // Verify mentee belongs to this mentor
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const mentee = await storage.getMentee(menteeId);
      if (!mentee || mentee.mentorId !== mentorRecord.id) {
        return res.status(403).json({ message: "Not authorized to update this mentee's records" });
      }

      // Create or update academic record with attendance
      const existingRecord = await storage.getAcademicRecord(menteeId, subjectId, semester, academicYear);
      let academicRecord;

      if (existingRecord) {
        academicRecord = await storage.updateAcademicRecord(existingRecord.id, {
          attendance: Number(attendance),
        });
      } else {
        academicRecord = await storage.createAcademicRecord({
          menteeId,
          subjectId,
          cie1Marks: null,
          cie2Marks: null,
          cie3Marks: null,
          avgCieMarks: null,
          assignmentMarks: null,
          totalMarks: null,
          attendance: Number(attendance),
          semester,
          academicYear,
        });
      }

      // Create notification for the mentee about their updated attendance
      const menteeUser = await storage.getUser(mentee.userId);
      if (menteeUser) {
        const notificationMessage = `Your attendance has been updated by your mentor. Current attendance: ${attendance}%.`;
        const isUrgent = Number(attendance) < 85;
        
        console.log(`Creating attendance notification for mentee ${menteeUser.name}:`, {
          message: notificationMessage,
          targetRoles: ['mentee'],
          isUrgent
        });
        
        await db.insert(notifications).values({
          message: notificationMessage,
          targetRoles: ['mentee'],
          isUrgent: isUrgent,
        });
        
        console.log(`Attendance notification created successfully for mentee ${menteeUser.name}`);
        
        // Also create a notification for the mentor to confirm the action
        await db.insert(notifications).values({
          message: `You have updated attendance for ${menteeUser.name} (${mentee.usn}) to ${attendance}%.`,
          targetRoles: ['mentor'],
          isUrgent: false,
        });
        
        console.log(`Mentor notification created for attendance update`);
      } else {
        console.log(`Could not find user for mentee ID ${mentee.userId}`);
      }

      res.status(201).json(academicRecord);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_attendance", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get academic records for mentor's mentees
  app.get("/api/mentor/academic-records", authenticateUser, requireMentor, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { academicYear } = req.query;
      if (!academicYear) {
        return res.status(400).json({ message: "Academic year is required" });
      }

      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      // Get all mentees for this mentor
      const mentees = await storage.getMenteesByMentor(mentorRecord.id);
      const menteeIds = mentees.map(m => m.id);

      if (menteeIds.length === 0) {
        return res.json([]);
      }

      // Get academic records for these mentees
      const records = await db.query.academicRecords.findMany({
        where: and(
          eq(schema.academicRecords.academicYear, academicYear as string),
          or(...menteeIds.map(id => eq(schema.academicRecords.menteeId, id)))
        ),
        with: {
          mentee: {
            with: {
              user: true
            }
          },
          subject: true
        }
      });

      // Format the records
      const formattedRecords = records.map(record => ({
        id: record.id,
        menteeId: record.menteeId,
        subjectId: record.subjectId,
        cie1Marks: record.cie1Marks,
        cie2Marks: record.cie2Marks,
        cie3Marks: record.cie3Marks,
        avgCieMarks: record.avgCieMarks,
        assignmentMarks: record.assignmentMarks,
        totalMarks: record.totalMarks,
        attendance: record.attendance,
        semester: record.semester,
        academicYear: record.academicYear,
        mentee: {
          name: record.mentee?.user?.name,
          usn: record.mentee?.usn
        },
        subject: {
          code: record.subject?.code,
          name: record.subject?.name
        }
      }));

      // Create notification for mentor if they have mentees with low attendance
      const lowAttendanceMentees = formattedRecords.filter(record => 
        record.attendance !== null && record.attendance < 85
      );
      
      if (lowAttendanceMentees.length > 0) {
        await db.insert(notifications).values({
          message: `You have ${lowAttendanceMentees.length} mentee(s) with attendance below 85%. Please review their progress.`,
          targetRoles: ['mentor'],
          isUrgent: true,
        });
      }

      res.json(formattedRecords);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_academic_records", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload mentees via Excel (by mentor)
  app.post("/api/mentor/upload-mentees", authenticateUser, requireMentor, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Validate data
      if (!data.length) {
        return res.status(400).json({ message: "Excel file is empty" });
      }

      // Process each student
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < data.length; i++) {
        const student = data[i] as any;
        try {
          // Basic validation
          if (!student.name || !student.usn || !student.semester || !student.section) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Missing required fields`);
            continue;
          }

          // Check if student already exists
          const existingMentee = await storage.getMenteeByUsn(student.usn);
          if (existingMentee) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Student with USN ${student.usn} already exists`);
            continue;
          }

          // Create user
          const username = student.usn.toLowerCase();
          const user = await storage.createUser({
            username,
            password: await hashPassword(username), // Default password same as username, properly hashed
            role: UserRole.MENTEE,
            name: student.name,
            email: student.email,
          });

          // Create mentee
          await storage.createMentee({
            userId: user.id,
            usn: student.usn,
            semester: parseInt(student.semester),
            section: student.section,
            mentorId: mentorRecord.id,
            mobileNumber: student.mobileNumber,
            parentMobileNumber: student.parentMobileNumber,
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
          await logError(req.user?.id ?? null, "upload_mentee", `Error processing row ${i + 2}: ${error.message}`, error.stack);
        }
      }

      // Log results
      if (results.failed > 0) {
        await logError(
          req.user?.id ?? null,
          "upload_mentees_partial",
          `${results.success} mentees imported successfully, ${results.failed} failed`,
          results.errors.join('\n')
        );
      }

      res.json({
        message: `${results.success} mentees imported successfully, ${results.failed} failed`,
        results,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "upload_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // ---------- MENTEE ROUTES ----------

  // Get mentee's profile and academic data
  app.get("/api/mentee/profile", authenticateUser, requireMentee, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      const mentor = menteeRecord.mentorId 
        ? await storage.getMentorWithDetails(menteeRecord.mentorId) 
        : null;

      res.json({
        mentee: {
          ...menteeRecord,
          name: req.user.name,
          email: req.user.email,
        },
        mentor,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentee_profile", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentee's academic records
  app.get("/api/mentee/academic-records", authenticateUser, requireMentee, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      const academicRecords = await storage.getAcademicRecordsByMentee(menteeRecord.id);
      res.json(academicRecords);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentee_academic_records", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get subjects
  app.get("/api/subjects", authenticateUser, async (req, res) => {
    try {
      const semester = req.query.semester ? parseInt(req.query.semester as string) : undefined;
      let subjectsList;
      
      if (semester) {
        subjectsList = await storage.getSubjectsBySemester(semester);
      } else {
        subjectsList = await storage.getAllSubjects();
      }
      
      res.json(subjectsList);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_subjects", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get subject by ID
  app.get("/api/subjects/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await storage.getSubject(parseInt(id));
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.json(subject);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_subject", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin subject management
  app.post("/api/admin/subjects", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { code, name, semester } = req.body;
      
      // Basic validation
      if (!code || !name || !semester) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Create new subject
      const subject = await storage.createSubject({
        code,
        name,
        semester: parseInt(semester)
      });
      
      // Log activity
      await storage.createErrorLog({
        userId: req.user?.id,
        action: "create_subject",
        errorMessage: `Subject ${name} (${code}) created for semester ${semester}`,
        stackTrace: ""
      });
      
      res.status(201).json(subject);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "create_subject", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update subject
  app.put("/api/admin/subjects/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { code, name, semester } = req.body;
      
      // Get existing subject
      const subject = await storage.getSubject(parseInt(id));
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      // Update subject
      const updatedSubject = await storage.updateSubject(parseInt(id), {
        code,
        name,
        semester: parseInt(semester)
      });
      
      // Log activity
      await storage.createErrorLog({
        userId: req.user?.id,
        action: "update_subject",
        errorMessage: `Subject ID ${id} updated: ${name} (${code}) for semester ${semester}`,
        stackTrace: ""
      });
      
      res.json(updatedSubject);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "update_subject", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete subject
  app.delete("/api/admin/subjects/:id", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await storage.getSubject(parseInt(id));
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      // Try to delete subject
      await storage.deleteSubject(parseInt(id));
      
      // Log activity
      await storage.createErrorLog({
        userId: req.user?.id,
        action: "delete_subject",
        errorMessage: `Subject ID ${id} (${subject.code} - ${subject.name}) deleted`,
        stackTrace: ""
      });
      
      res.status(200).json({ message: "Subject deleted successfully" });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "delete_subject", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentee's self-assessments
  app.get("/api/mentee/self-assessments", authenticateUser, requireMentee, async (req, res) => {
    try {
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      const assessments = await storage.getSelfAssessmentsByMentee(menteeRecord.id);
      res.json(assessments);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_mentee_self_assessments", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Create mentee's self-assessment
  app.post("/api/mentee/self-assessments", authenticateUser, requireMentee, async (req, res) => {
    try {
      if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      // Validate request body
      const { 
        academicGoals, careerAspirations, strengths, areasToImprove, 
        studyHoursPerDay, stressLevel, academicConfidence, challenges, supportNeeded 
      } = insertSelfAssessmentSchema.parse({
        ...req.body,
        menteeId: menteeRecord.id,
      });

      // Create self-assessment
      const assessment = await storage.createSelfAssessment({
        menteeId: menteeRecord.id,
        academicGoals,
        careerAspirations,
        strengths,
        areasToImprove,
        studyHoursPerDay,
        stressLevel,
        academicConfidence,
        challenges,
        supportNeeded,
      });

      res.status(201).json(assessment);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "create_mentee_self_assessment", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for the current user
  app.get("/api/messages", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const messages = await storage.getMessagesByUser(req.user.id);
      res.json(messages);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_messages", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Send a message
  app.post("/api/messages", authenticateUser, async (req, res) => {
    try {
      // Validate request body
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { receiverId, content } = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
      });

      // Verify receiver exists (only for individual messages, not group messages)
      if (receiverId) {
        const receiver = await storage.getUser(receiverId);
        if (!receiver) {
          return res.status(404).json({ message: "Receiver not found" });
        }
      }

      // Create message
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        content,
        isRead: false,
      });

      res.status(201).json(message);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "send_message", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark message as read
  app.patch("/api/messages/:id/read", authenticateUser, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await storage.markMessageAsRead(messageId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "mark_message_read", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get group messages for mentor and mentees
  app.get("/api/group-messages", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let mentorId: number;
      
      if (req.user.role === UserRole.MENTOR) {
        // If user is mentor, get their mentor record
        const mentorRecord = await storage.getMentorByUserId(req.user.id);
        if (!mentorRecord) {
          return res.status(404).json({ message: "Mentor profile not found" });
        }
        mentorId = mentorRecord.id;
      } else if (req.user.role === UserRole.MENTEE) {
        // If user is mentee, get their mentor
        const mentee = await storage.getMenteeByUserId(req.user.id);
        if (!mentee || !mentee.mentorId) {
          return res.status(404).json({ message: "No mentor assigned" });
        }
        mentorId = mentee.mentorId;
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getGroupMessagesByMentor(mentorId);
      res.json(messages);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_group_messages", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Send group message
  app.post("/api/group-messages", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      let mentorId: number;
      
      if (req.user.role === UserRole.MENTOR) {
        // If user is mentor, get their mentor record
        const mentorRecord = await storage.getMentorByUserId(req.user.id);
        if (!mentorRecord) {
          return res.status(404).json({ message: "Mentor profile not found" });
        }
        mentorId = mentorRecord.id;
      } else if (req.user.role === UserRole.MENTEE) {
        // If user is mentee, get their mentor
        const mentee = await storage.getMenteeByUserId(req.user.id);
        if (!mentee || !mentee.mentorId) {
          return res.status(404).json({ message: "No mentor assigned" });
        }
        mentorId = mentee.mentorId;
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create group message
      const message = await storage.createGroupMessage({
        senderId: req.user.id,
        mentorId,
        content: content.trim(),
        isGroupMessage: true,
        isRead: false,
      });

      // Create notifications for group chat
      if (req.user.role === UserRole.MENTOR) {
        // If mentor sends message, notify all mentees
        const mentees = await storage.getMenteesByMentor(mentorId);
        const mentorName = req.user.name || req.user.username;
        
        for (const mentee of mentees) {
          await db.insert(schema.notifications).values({
            message: `New message from ${mentorName} in group chat`,
            targetRoles: [UserRole.MENTEE],
            targetUserId: mentee.userId,
            isUrgent: false,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } else if (req.user.role === UserRole.MENTEE) {
        // If mentee sends message, notify mentor and other mentees
        const menteeName = req.user.name || req.user.username;
        
        // Get mentor's user ID
        const mentor = await storage.getMentor(mentorId);
        if (mentor) {
          await db.insert(schema.notifications).values({
            message: `New message from ${menteeName} in group chat`,
            targetRoles: [UserRole.MENTOR],
            targetUserId: mentor.userId,
            isUrgent: false,
            isRead: false,
            createdAt: new Date(),
          });
        }
        
        // Notify other mentees in the group
        const mentees = await storage.getMenteesByMentor(mentorId);
        
        for (const mentee of mentees) {
          // Skip notifying the sender themselves
          if (mentee.userId !== req.user.id) {
            await db.insert(schema.notifications).values({
              message: `New message from ${menteeName} in group chat`,
              targetRoles: [UserRole.MENTEE],
              targetUserId: mentee.userId,
              isUrgent: false,
              isRead: false,
              createdAt: new Date(),
            });
          }
        }
      }

      res.status(201).json(message);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "send_group_message", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get group members (mentor and mentees)
  app.get("/api/group-members", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let mentorId: number;
      let members: any[] = [];
      
      if (req.user.role === UserRole.MENTOR) {
        // If user is mentor, get their mentor record and mentees
        const mentorRecord = await storage.getMentorByUserId(req.user.id);
        if (!mentorRecord) {
          return res.status(404).json({ message: "Mentor profile not found" });
        }
        mentorId = mentorRecord.id;
        
        // Add mentor to members
        members.push({
          id: req.user.id,
          name: req.user.name || req.user.username,
          role: "mentor"
        });
        
        // Get all mentees of this mentor
        const mentees = await storage.getMenteesByMentor(mentorId);
        for (const mentee of mentees) {
          const menteeUser = await storage.getUser(mentee.userId);
          if (menteeUser) {
            members.push({
              id: menteeUser.id,
              name: menteeUser.name || menteeUser.username,
              role: "mentee",
              usn: mentee.usn
            });
          }
        }
      } else if (req.user.role === UserRole.MENTEE) {
        // If user is mentee, get their mentor and fellow mentees
        const mentee = await storage.getMenteeByUserId(req.user.id);
        if (!mentee || !mentee.mentorId) {
          return res.status(404).json({ message: "No mentor assigned" });
        }
        mentorId = mentee.mentorId;
        
        // Get mentor
        const mentorRecord = await storage.getMentor(mentorId);
        if (mentorRecord) {
          const mentorUser = await storage.getUser(mentorRecord.userId);
          if (mentorUser) {
            members.push({
              id: mentorUser.id,
              name: mentorUser.name || mentorUser.username,
              role: "mentor"
            });
          }
        }
        
        // Get all mentees of this mentor (including current user)
        const mentees = await storage.getMenteesByMentor(mentorId);
        for (const m of mentees) {
          const menteeUser = await storage.getUser(m.userId);
          if (menteeUser) {
            members.push({
              id: menteeUser.id,
              name: menteeUser.name || menteeUser.username,
              role: "mentee",
              usn: m.usn
            });
          }
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(members);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_group_members", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Clean up old group messages (older than 1 month)
  app.post("/api/group-messages/cleanup", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admins can trigger cleanup
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      console.log("Starting cleanup of old group messages...");
      const deletedCount = await storage.deleteOldGroupMessages();
      console.log(`Cleanup completed. Deleted ${deletedCount} messages.`);
      
      res.json({ 
        message: `Successfully deleted ${deletedCount} old group messages`,
        deletedCount 
      });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      await logError(req.user?.id ?? null, "cleanup_group_messages", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all group chats for admin
  app.get("/api/admin/group-chats", authenticateUser, requireAdmin, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admins can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const groupChats = await storage.getAllGroupChats();
      
      res.json(groupChats);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_all_group_chats", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get admin-mentor messages
  app.get("/api/admin-mentor-messages", authenticateUser, adminMentorMessagesCacheMiddleware, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admins and mentors can access this endpoint
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MENTOR) {
        return res.status(403).json({ message: "Access denied. Admin and mentors only." });
      }

      const messages = await storage.getAdminMentorMessages();
      
      res.json(messages);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "get_admin_mentor_messages", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  }, cacheResponse);

  // Send admin-mentor message
  app.post("/api/admin-mentor-messages", authenticateUser, invalidateCacheOnWrite([cacheKeys.adminMentorMessages()]), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admins and mentors can send messages
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MENTOR) {
        return res.status(403).json({ message: "Access denied. Admin and mentors only." });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Create admin-mentor message
      const message = await storage.createAdminMentorMessage({
        senderId: req.user.id,
        receiverId: null, // No specific receiver for admin-mentor chat
        mentorId: null, // Not a mentor-specific message
        content: content.trim(),
        isRead: false,
        isGroupMessage: false,
        isAdminMentorMessage: true,
      });

      // Create notification for the other role
      const targetRole = req.user.role === UserRole.ADMIN ? UserRole.MENTOR : UserRole.ADMIN;
      const senderName = req.user.name || req.user.username;
      
      await db.insert(schema.notifications).values({
        message: `New message from ${senderName} in admin-mentor chat`,
        targetRoles: [targetRole],
        targetUserId: null, // Notify all users of the target role
        isUrgent: false,
        isRead: false,
      });

      res.status(201).json(message);
    } catch (error: any) {
      await logError(req.user?.id ?? null, "send_admin_mentor_message", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Duplicate notification endpoints removed to fix field name inconsistencies

  // ---------- EXCEL UPLOAD ROUTES ----------

  // Upload mentees from Excel file
  app.post("/api/admin/upload/mentees", authenticateUser, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read the Excel file
      const workbook = xlsx.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or has invalid format" });
      }

      // Process mentee data and create users and mentees
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of data) {
        try {
          // Ensure row is treated as an object with string keys
          const r = row as Record<string, any>;
          // Extract data from row
          const usn = r.USN || r.usn;
          const name = r.Name || r.name;
          const email = r.Email || r.email;
          const mobileNumber = r.MobileNumber || r.mobileNumber || r.Mobile || r.mobile;
          const semester = parseInt(r.Semester || r.semester) || 1;
          const section = r.Section || r.section;
          const batch = r.Batch || r.batch;
          const mentorUsernameRaw = r.MentorUsername || r.mentorUsername || r.Mentor || r.mentor;
          const mentorIdRaw = r.MentorId || r.mentorId || r.MentorID || r.mentorID || r.Mentor_Id || r.mentor_Id;

          if (!usn || !name) {
            throw new Error(`Missing required fields (USN, name) for row: ${JSON.stringify(row)}`);
          }

          // Resolve mentor mapping if provided
          let resolvedMentorId: number | null = null;
          // 1) Prefer explicit MentorId if provided and valid
          if (mentorIdRaw !== undefined && mentorIdRaw !== null && String(mentorIdRaw).trim() !== "") {
            const candidateId = Number(String(mentorIdRaw).trim());
            if (!Number.isNaN(candidateId) && Number.isFinite(candidateId)) {
              const candidateMentor = await storage.getMentor(candidateId);
              if (candidateMentor) {
                resolvedMentorId = candidateMentor.id;
              } else {
                errors.push({ row, warning: `MentorId '${mentorIdRaw}' not found` });
              }
            } else {
              errors.push({ row, warning: `MentorId '${mentorIdRaw}' is not a valid number` });
            }
          }

          // 2) Fallback to MentorUsername mapping
          if (resolvedMentorId === null && mentorUsernameRaw && typeof mentorUsernameRaw === "string") {
            const normalized = String(mentorUsernameRaw)
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ".")
              .replace(/[^a-z0-9.]/g, "");
            if (normalized) {
              const user = await storage.getUserByUsername(normalized);
              if (user) {
                const mentor = await storage.getMentorByUserId(user.id);
                if (mentor) {
                  resolvedMentorId = mentor.id;
                } else {
                  errors.push({ row, warning: `User '${normalized}' exists but has no mentor profile` });
                }
              } else {
                // Try without dots as a fallback (handles older usernames without separators)
                const noDots = normalized.replace(/\./g, "");
                const userNoDots = noDots ? await storage.getUserByUsername(noDots) : undefined;
                if (userNoDots) {
                  const mentor = await storage.getMentorByUserId(userNoDots.id);
                  if (mentor) {
                    resolvedMentorId = mentor.id;
                  }
                }

                // Final fallback: try matching by mentor display name
                if (resolvedMentorId === null) {
                  const desiredName = String(mentorUsernameRaw).trim().toLowerCase().replace(/\s+/g, " ");
                  try {
                    const mentorsList = await storage.getAllMentorsWithDetails();
                    const matched = mentorsList.find(m => (m.name || "").trim().toLowerCase().replace(/\s+/g, " ") === desiredName);
                    if (matched) {
                      resolvedMentorId = matched.id;
                    }
                  } catch (_) {}
                }

                if (resolvedMentorId === null) {
                  errors.push({ row, warning: `Mentor identifier '${mentorUsernameRaw}' not found` });
                }
              }
            }
          }

          // Check if mentee with this USN already exists
          const existingMentee = await storage.getMenteeByUsn(usn);
          if (existingMentee) {
            // Update the existing mentee
            const updatedMentee = await storage.updateMentee(existingMentee.id, {
              usn,
              semester,
              section,
              mobileNumber,
              ...(resolvedMentorId !== null ? { mentorId: resolvedMentorId } : {}),
            });

            // Update the user account
            if (existingMentee.userId) {
              await storage.updateUser(existingMentee.userId, {
                name,
                email: email || undefined,
              });
            }

            results.push({
              usn,
              name,
              status: "updated",
            });
            successCount++;
            continue;
          }

          // Create a new user account for the mentee
          const user = await storage.createUser({
            username: usn, // Use USN as username
            password: await hashPassword(usn), // Initially set password to USN
            role: UserRole.MENTEE,
            name,
            email: email || undefined,
          });

          // Create a new mentee record
          const mentee = await storage.createMentee({
            userId: user.id,
            usn,
            semester,
            section,
            mobileNumber,
            mentorId: resolvedMentorId, // If provided, assign now; otherwise null
          });

          results.push({
            usn,
            name,
            status: "created",
          });
          successCount++;
        } catch (err) {
          console.error("Error processing mentee row:", err);
          errorCount++;
          errors.push({
            row,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      // After importing all mentees, run the mentor assignment algorithm
      // to distribute them among mentors
      try {
        // This will balance mentees across all mentors, ensuring each mentor has
        // students from all semesters
        const assignmentResult = await storage.assignMenteesToMentors();
        
        // Add a system notification about the import
        const { db } = await import("@db");
        await db.insert(notifications).values({
          message: `${successCount} mentees imported and automatically assigned to mentors`,
          targetRoles: [UserRole.ADMIN, UserRole.MENTOR],
          isRead: false,
          isUrgent: false,
          createdAt: new Date(),
        });
        
        res.json({
          success: true,
          imported: successCount,
          errors: errorCount,
          errorDetails: errors,
          results,
          assignment: assignmentResult,
        });
      } catch (assignmentErr) {
        // If assignment fails, the import was still successful
        res.json({
          success: true,
          imported: successCount,
          errors: errorCount,
          errorDetails: errors,
          results,
          assignmentError: assignmentErr instanceof Error ? assignmentErr.message : "Unknown error",
        });
      }
    } catch (error: any) {
      await logError(req.user?.id ?? null, "upload_mentees_excel", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload mentors from Excel file
  app.post("/api/admin/upload/mentors", authenticateUser, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read the Excel file
      const workbook = xlsx.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or has invalid format" });
      }

      // Process mentor data and create users and mentors
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of data) {
        try {
          // Ensure row is treated as an object with string keys
          const r = row as Record<string, any>;
          // Extract data from row
          const name = r.Name || r.name || r.FullName || r.fullName;
          const email = r.Email || r.email || r.EmailAddress || r.emailAddress;
          const mobileNumber = r.MobileNumber || r.mobileNumber || r.Mobile || r.mobile || r.Phone || r.phone;
          const department = r.Department || r.department || r.Dept || r.dept;
          const specialization = r.Specialization || r.specialization || r.Designation || r.designation || r.Title || r.title || r.Position || r.position;

          if (!name || !department) {
            console.log(`[DEBUG] Row data:`, JSON.stringify(row));
            console.log(`[DEBUG] Extracted name: ${name}, department: ${department}`);
            throw new Error(`Missing required fields (name, department) for row: ${JSON.stringify(row)}`);
          }

          // Create username from name (same logic as individual mentor creation)
          const nameParts = String(name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
          const fromName = nameParts
            .map(p => p.replace(/[^a-z0-9]/g, ''))
            .filter(Boolean)
            .join('.');
          const fromEmail = (email ? email.split('@')[0] : '').toLowerCase().replace(/[^a-z0-9.]/g, '');
          const baseUsername = (fromName || fromEmail || 'mentor');

          // If a user already exists with this username, attach mentor profile to that user
          const preExistingUser = await storage.getUserByUsername(baseUsername);
          if (preExistingUser) {
            // If a mentor profile is already linked, update it
            const existingMentor = await storage.getMentorByUserId(preExistingUser.id);
            if (existingMentor) {
              // Update existing mentor
              await storage.updateMentor(existingMentor.id, {
                department,
                specialization,
                mobileNumber,
              });

              // Update user info
              await storage.updateUser(preExistingUser.id, {
                name,
                email: email || undefined,
              });

              results.push({
                name,
                username: preExistingUser.username,
                status: "updated",
              });
              successCount++;
              continue;
            }

            // Ensure role is mentor and update basic info
            await storage.updateUser(preExistingUser.id, {
              role: UserRole.MENTOR,
              name,
              email: email || undefined,
            });

            const mentor = await storage.createMentor({
              userId: preExistingUser.id,
              department,
              specialization,
              mobileNumber,
              isActive: true,
            });

            results.push({
              name,
              username: preExistingUser.username,
              status: "created",
            });
            successCount++;
            continue;
          }

          // Ensure unique username for a brand-new user
          let username = baseUsername;
          let suffix = 1;
          while (await storage.getUserByUsername(username)) {
            username = `${baseUsername}${suffix++}`;
          }

          // Create new user
          const hashedPassword = await hashPassword(username); // Use username as password
          const user = await storage.createUser({
            username,
            password: hashedPassword,
            role: UserRole.MENTOR,
            name,
            email: email || undefined,
          });

          // Create mentor profile
          const mentor = await storage.createMentor({
            userId: user.id,
            department,
            specialization,
            mobileNumber,
            isActive: true,
          });

          results.push({
            name,
            username,
            status: "created",
          });
          successCount++;
        } catch (err) {
          console.error("Error processing mentor row:", err);
          errorCount++;
          errors.push({
            row,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      // Add a system notification about the import
      const { db } = await import("@db");
      await db.insert(notifications).values({
        message: `${successCount} mentors imported successfully`,
        targetRoles: [UserRole.ADMIN],
        isRead: false,
        isUrgent: false,
        createdAt: new Date(),
      });

      res.json({
        success: true,
        imported: successCount,
        errors: errorCount,
        errorDetails: errors,
        results,
      });
    } catch (error: any) {
      await logError(req.user?.id ?? null, "upload_mentors_excel", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
