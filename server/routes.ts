import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import { eq, and, desc, lt, asc } from "drizzle-orm";
import {
  users,
  mentors,
  mentees,
  academicRecords,
  errorLogs,
  subjects,
  selfAssessments,
  messages,
  UserRole,
  insertSelfAssessmentSchema,
  insertMessageSchema,
} from "@shared/schema";
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
    if (!req.isAuthenticated()) {
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
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
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
      await logError(req.user?.id, "update_profile", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Change password
  app.post("/api/user/:id/change-password", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Ensure user can only update their own password
      if (req.user.id !== userId) {
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
      await logError(req.user?.id, "change_password", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update notification settings
  app.post("/api/user/:id/notification-settings", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Ensure user can only update their own notification settings
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "You can only update your own notification settings" });
      }
      
      // Mock response as we don't have a notification settings table yet
      res.json({
        message: "Notification settings updated successfully",
        settings: req.body,
      });
    } catch (error: any) {
      await logError(req.user?.id, "update_notification_settings", error.message, error.stack);
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

      // Mock growth data for now, in a real app you'd compare with previous semester
      const studentGrowth = 5.3;
      const mentorGrowth = 2.1;

      res.json({
        totalStudents,
        totalMentors,
        avgMenteesPerMentor,
        atRiskStudents,
        studentGrowth,
        mentorGrowth,
      });
    } catch (error: any) {
      await logError(req.user?.id, "get_dashboard_stats", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get at-risk students (attendance < 85%)
  app.get("/api/admin/at-risk-students", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const atRiskStudents = await storage.getAtRiskMentees();
      res.json(atRiskStudents);
    } catch (error: any) {
      await logError(req.user?.id, "get_at_risk_students", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get recent activities
  app.get("/api/admin/activities", authenticateUser, requireAdmin, async (req, res) => {
    try {
      // This would typically come from an activity log table
      // For now, returning some mock data
      const activities = [
        {
          id: 1,
          type: "upload",
          description: "Student data uploaded successfully",
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          type: "add",
          description: "New mentor Prof. Kumar added",
          timestamp: new Date(Date.now() - 86400000).toISOString(), // yesterday
        },
        {
          id: 3,
          type: "warning",
          description: "5 students marked as at-risk",
          timestamp: new Date(Date.now() - 86400000).toISOString(), // yesterday
        },
        {
          id: 4,
          type: "transfer",
          description: "Students reassigned from Dr. Singh",
          timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        },
        {
          id: 5,
          type: "delete",
          description: "Student Vikram Malhotra deleted",
          timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
        },
      ];
      res.json(activities);
    } catch (error: any) {
      await logError(req.user?.id, "get_activities", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all students
  app.get("/api/admin/students", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const students = await storage.getAllMenteesWithDetails();
      res.json(students);
    } catch (error: any) {
      await logError(req.user?.id, "get_all_students", error.message, error.stack);
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
        password: username, // Default password same as username, should be changed on first login
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
      await logError(req.user?.id, "add_student", error.message, error.stack);
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

      res.json({
        ...updatedMentee,
        name,
        email,
      });
    } catch (error: any) {
      await logError(req.user?.id, "update_student", error.message, error.stack);
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

      // Delete mentee record
      await storage.deleteMentee(parseInt(id));
      
      // Delete user account
      await storage.deleteUser(mentee.userId);

      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error: any) {
      await logError(req.user?.id, "delete_student", error.message, error.stack);
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
          } else {
            // For manual, just leave it null
            mentorId = null;
          }

          // Create user
          const username = student.usn.toLowerCase();
          const user = await storage.createUser({
            username,
            password: username, // Default password same as username
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
          await logError(req.user?.id, "upload_student", `Error processing row ${i + 2}: ${error.message}`, error.stack);
        }
      }

      // Log results
      if (results.failed > 0) {
        await logError(
          req.user?.id,
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
      await logError(req.user?.id, "upload_students", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all mentors
  app.get("/api/mentors", authenticateUser, async (req, res) => {
    try {
      const mentors = await storage.getAllMentorsWithDetails();
      res.json(mentors);
    } catch (error: any) {
      await logError(req.user?.id, "get_all_mentors", error.message, error.stack);
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
      await logError(req.user?.id, "get_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Add a mentor
  app.post("/api/admin/mentors", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { name, email, department, specialization, mobileNumber } = req.body;

      // Create username from email or name
      const username = email 
        ? email.split('@')[0] 
        : name.toLowerCase().replace(/\s+/g, '.');

      // Create user account first
      const user = await storage.createUser({
        username,
        password: username, // Default password same as username, should be changed on first login
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
      await logError(req.user?.id, "add_mentor", error.message, error.stack);
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
      await logError(req.user?.id, "update_mentor", error.message, error.stack);
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
      
      // Delete user account
      await storage.deleteUser(mentor.userId);

      res.status(200).json({ message: "Mentor deleted successfully" });
    } catch (error: any) {
      await logError(req.user?.id, "delete_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get error logs
  app.get("/api/admin/error-logs", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const errorLogsList = await storage.getErrorLogs();
      res.json(errorLogsList);
    } catch (error: any) {
      await logError(req.user?.id, "get_error_logs", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // ---------- MENTOR ROUTES ----------

  // Get mentor dashboard stats
  app.get("/api/mentor/dashboard/stats", authenticateUser, requireMentor, async (req, res) => {
    try {
      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const totalMentees = await storage.countMenteesByMentor(mentorRecord.id);
      const atRiskMentees = await storage.countAtRiskMenteesByMentor(mentorRecord.id);
      const averageAttendance = await storage.getAverageAttendanceByMentor(mentorRecord.id);
      const semesterDistribution = await storage.getMenteeSemesterDistribution(mentorRecord.id);

      res.json({
        totalMentees,
        atRiskMentees,
        averageAttendance,
        semesterDistribution,
      });
    } catch (error: any) {
      await logError(req.user?.id, "get_mentor_dashboard_stats", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentor's mentees
  app.get("/api/mentor/mentees", authenticateUser, requireMentor, async (req, res) => {
    try {
      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const mentees = await storage.getMenteesByMentor(mentorRecord.id);
      res.json(mentees);
    } catch (error: any) {
      await logError(req.user?.id, "get_mentor_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentor's at-risk mentees
  app.get("/api/mentor/at-risk-mentees", authenticateUser, requireMentor, async (req, res) => {
    try {
      // Get mentor ID for current user
      const mentorRecord = await storage.getMentorByUserId(req.user.id);
      if (!mentorRecord) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }

      const atRiskMentees = await storage.getAtRiskMenteesByMentor(mentorRecord.id);
      res.json(atRiskMentees);
    } catch (error: any) {
      await logError(req.user?.id, "get_mentor_at_risk_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Add a mentee (by mentor)
  app.post("/api/mentor/mentees", authenticateUser, requireMentor, async (req, res) => {
    try {
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
        password: username, // Default password same as username, should be changed on first login
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
      await logError(req.user?.id, "add_mentee_by_mentor", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a mentee's academic record
  app.post("/api/mentor/academic-records", authenticateUser, requireMentor, async (req, res) => {
    try {
      const { menteeId, subjectId, cieMarks, assignmentMarks, totalMarks, attendance, semester, academicYear } = req.body;

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
          cieMarks,
          assignmentMarks,
          totalMarks,
          attendance,
        });
      } else {
        academicRecord = await storage.createAcademicRecord({
          menteeId,
          subjectId,
          cieMarks,
          assignmentMarks,
          totalMarks,
          attendance,
          semester,
          academicYear,
        });
      }

      res.status(201).json(academicRecord);
    } catch (error: any) {
      await logError(req.user?.id, "update_academic_record", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload mentees via Excel (by mentor)
  app.post("/api/mentor/upload-mentees", authenticateUser, requireMentor, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
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
            password: username, // Default password same as username
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
          await logError(req.user?.id, "upload_mentee", `Error processing row ${i + 2}: ${error.message}`, error.stack);
        }
      }

      // Log results
      if (results.failed > 0) {
        await logError(
          req.user?.id,
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
      await logError(req.user?.id, "upload_mentees", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // ---------- MENTEE ROUTES ----------

  // Get mentee's profile and academic data
  app.get("/api/mentee/profile", authenticateUser, requireMentee, async (req, res) => {
    try {
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
      await logError(req.user?.id, "get_mentee_profile", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentee's academic records
  app.get("/api/mentee/academic-records", authenticateUser, requireMentee, async (req, res) => {
    try {
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      const academicRecords = await storage.getAcademicRecordsByMentee(menteeRecord.id);
      res.json(academicRecords);
    } catch (error: any) {
      await logError(req.user?.id, "get_mentee_academic_records", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get subjects
  app.get("/api/subjects", authenticateUser, async (req, res) => {
    try {
      const subjectsList = await storage.getAllSubjects();
      res.json(subjectsList);
    } catch (error: any) {
      await logError(req.user?.id, "get_subjects", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get mentee's self-assessments
  app.get("/api/mentee/self-assessments", authenticateUser, requireMentee, async (req, res) => {
    try {
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      const assessments = await storage.getSelfAssessmentsByMentee(menteeRecord.id);
      res.json(assessments);
    } catch (error: any) {
      await logError(req.user?.id, "get_mentee_self_assessments", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Create mentee's self-assessment
  app.post("/api/mentee/self-assessments", authenticateUser, requireMentee, async (req, res) => {
    try {
      const menteeRecord = await storage.getMenteeByUserId(req.user.id);
      if (!menteeRecord) {
        return res.status(404).json({ message: "Mentee profile not found" });
      }

      // Validate request body
      const { 
        academicGoals, careerAspirations, strengths, areasToImprove, 
        studyHoursPerDay, stressLevel, academicConfidence, challenges, supportNeeded 
      } = schema.insertSelfAssessmentSchema.parse({
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
      await logError(req.user?.id, "create_mentee_self_assessment", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for the current user
  app.get("/api/messages", authenticateUser, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.user.id);
      res.json(messages);
    } catch (error: any) {
      await logError(req.user?.id, "get_messages", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  // Send a message
  app.post("/api/messages", authenticateUser, async (req, res) => {
    try {
      // Validate request body
      const { receiverId, content } = schema.insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
      });

      // Verify receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
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
      await logError(req.user?.id, "send_message", error.message, error.stack);
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
      await logError(req.user?.id, "mark_message_read", error.message, error.stack);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
