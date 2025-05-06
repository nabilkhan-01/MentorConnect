import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seed...");

    // Check if we already have an admin user
    const existingAdmin = await db.query.users.findFirst({
      where: eq(schema.users.role, schema.UserRole.ADMIN)
    });

    if (existingAdmin) {
      console.log("Admin user already exists, skipping user creation");
    } else {
      console.log("Creating initial users...");

      // Create admin user
      const adminPassword = await hashPassword("admin123");
      const admin = await db.insert(schema.users).values({
        username: "admin",
        password: adminPassword,
        role: schema.UserRole.ADMIN,
        name: "Admin User",
        email: "admin@college.edu",
      }).returning();
      console.log(`Created admin user: ${admin[0].username}`);

      // Create some mentor users
      const mentors = [
        { name: "Dr. Sharma", department: "Computer Science", specialization: "Algorithms" },
        { name: "Prof. Gupta", department: "Computer Science", specialization: "Database Systems" },
        { name: "Dr. Reddy", department: "Computer Science", specialization: "Machine Learning" },
      ];

      for (const mentorData of mentors) {
        const username = mentorData.name.toLowerCase().replace(/\s+/g, ".");
        // Make sure we don't have double dots in the username
        const cleanUsername = username.replace(/\.+/g, ".");
        const password = await hashPassword(cleanUsername);
        
        const mentor = await db.insert(schema.users).values({
          username: cleanUsername,
          password,
          role: schema.UserRole.MENTOR,
          name: mentorData.name,
          email: `${cleanUsername}@college.edu`,
        }).returning();

        await db.insert(schema.mentors).values({
          userId: mentor[0].id,
          department: mentorData.department,
          specialization: mentorData.specialization,
          mobileNumber: "9876543210",
          isActive: true,
        });

        console.log(`Created mentor: ${mentor[0].name}`);
      }

      // Get all mentors for assigning mentees
      const mentorRecords = await db.query.mentors.findMany();
      if (mentorRecords.length === 0) {
        throw new Error("No mentors created, cannot continue with seed");
      }

      // Create some subjects
      const subjects = [
        { code: "CS101", name: "Introduction to Programming", semester: 1 },
        { code: "CS102", name: "Data Structures", semester: 2 },
        { code: "CS201", name: "Algorithms", semester: 3 },
        { code: "CS202", name: "Database Systems", semester: 3 },
        { code: "CS301", name: "Software Engineering", semester: 5 },
        { code: "CS302", name: "Web Development", semester: 5 },
        { code: "CS401", name: "Machine Learning", semester: 7 },
        { code: "CS402", name: "Computer Networks", semester: 7 },
      ];

      for (const subjectData of subjects) {
        await db.insert(schema.subjects).values(subjectData);
        console.log(`Created subject: ${subjectData.name}`);
      }

      // Get created subjects
      const subjectRecords = await db.query.subjects.findMany();

      // Create some mentee users with academic records
      const mentees = [
        { name: "Aishwarya Rana", usn: "1SI19CS013", semester: 5, section: "A", attendance: 78.2 },
        { name: "Rahul Verma", usn: "1SI19CS045", semester: 5, section: "B", attendance: 82.5 },
        { name: "Meera Patel", usn: "1SI20CS102", semester: 3, section: "A", attendance: 75.9 },
        { name: "Arjun Singh", usn: "1SI20CS056", semester: 3, section: "B", attendance: 90.5 },
        { name: "Priya Kumar", usn: "1SI21CS077", semester: 1, section: "A", attendance: 95.3 },
      ];

      for (const menteeData of mentees) {
        // Assign to a random mentor
        const mentorId = mentorRecords[Math.floor(Math.random() * mentorRecords.length)].id;
        
        // Create user
        const username = menteeData.usn.toLowerCase();
        const password = await hashPassword(username);
        
        const mentee = await db.insert(schema.users).values({
          username,
          password,
          role: schema.UserRole.MENTEE,
          name: menteeData.name,
          email: `${username}@college.edu`,
        }).returning();

        // Create mentee record
        const menteeRecord = await db.insert(schema.mentees).values({
          userId: mentee[0].id,
          usn: menteeData.usn,
          semester: menteeData.semester,
          section: menteeData.section,
          mentorId,
          mobileNumber: "9876543210",
          parentMobileNumber: "9876543211",
          isActive: true,
        }).returning();

        console.log(`Created mentee: ${mentee[0].name}`);

        // Add academic records for this mentee
        // Get subjects for this semester
        const semesterSubjects = subjectRecords.filter(s => s.semester === menteeData.semester);
        
        // Create academic records for each subject
        for (const subject of semesterSubjects) {
          // Generate random marks and attendance (but ensure at-risk students have low attendance)
          const attendance = menteeData.attendance;
          const cieMarks = Math.floor(Math.random() * 21) + 30; // 30-50
          const assignmentMarks = Math.floor(Math.random() * 21) + 30; // 30-50
          const totalMarks = cieMarks + assignmentMarks;

          await db.insert(schema.academicRecords).values({
            menteeId: menteeRecord[0].id,
            subjectId: subject.id,
            cieMarks,
            assignmentMarks,
            totalMarks,
            attendance,
            semester: menteeData.semester,
            academicYear: "2023-2024",
          });

          console.log(`Created academic record for ${mentee[0].name} in ${subject.name}`);
        }
      }
    }

    // Create some notifications
    const notificationsExist = await db.query.notifications.findFirst();
    
    if (!notificationsExist) {
      console.log("Creating initial notifications...");
      
      const notificationsData = [
        {
          message: "Welcome to the Mentor-Mentee Portal",
          isRead: false,
          isUrgent: false,
          targetRoles: ["admin", "mentor", "mentee"],
          createdAt: new Date()
        },
        {
          message: "5 students have attendance below 85%",
          isRead: false,
          isUrgent: true,
          targetRoles: ["admin", "mentor"],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          message: "New student data uploaded successfully",
          isRead: false,
          isUrgent: false,
          targetRoles: ["admin"],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          message: "Your mentor has scheduled a meeting for Friday",
          isRead: false,
          isUrgent: true,
          targetRoles: ["mentee"],
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
        },
        {
          message: "Don't forget to update your academic progress this week",
          isRead: false,
          isUrgent: false,
          targetRoles: ["mentee"],
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        }
      ];
      
      for (const notification of notificationsData) {
        await db.insert(schema.notifications).values(notification);
        console.log(`Created notification: ${notification.message}`);
      }
    }
    
    console.log("Seed completed successfully");
  }
  catch (error) {
    console.error("Error during seeding:", error);
  }
}

seed();
