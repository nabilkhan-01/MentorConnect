import "dotenv/config";
import { db } from "./index";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

function round1(num: number) {
  return Math.round(num * 10) / 10;
}

function pickOne<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

type PerformanceProfile =
  | "atRiskHighMarks"
  | "atRiskLowMarks"
  | "safeHighMarks"
  | "safeLowMarks";

function pickProfile(index: number): PerformanceProfile {
  // Deterministic mix across 20 mentees
  if (index < 4) return "atRiskHighMarks";
  if (index < 8) return "atRiskLowMarks";
  if (index < 14) return "safeHighMarks";
  return "safeLowMarks";
}

function generateMarksAndAttendance(rng: () => number, profile: PerformanceProfile) {
  // attendance determines at-risk (avg < 85)
  const attendanceRange =
    profile === "atRiskHighMarks" ? [70, 82]
    : profile === "atRiskLowMarks" ? [60, 78]
    : profile === "safeHighMarks" ? [88, 96]
    : [86, 95];

  const totalRange =
    profile === "atRiskHighMarks" ? [42, 49]
    : profile === "atRiskLowMarks" ? [18, 30]
    : profile === "safeHighMarks" ? [40, 49]
    : [18, 28];

  const attendance = round1(attendanceRange[0] + rng() * (attendanceRange[1] - attendanceRange[0]));
  const totalMarks = round1(totalRange[0] + rng() * (totalRange[1] - totalRange[0]));

  // Split into avgCie (out of 30) + assignment (out of 20)
  const assignmentMin = profile.includes("High") ? 12 : 6;
  const assignmentMax = profile.includes("High") ? 20 : 14;
  const assignmentMarks = round1(assignmentMin + rng() * (assignmentMax - assignmentMin));
  const avgCieMarks = round1(clamp(totalMarks - assignmentMarks, 0, 30));

  // Create 3 CIE marks around avg
  const jitter = () => (rng() - 0.5) * 6; // +/- 3
  const cie1 = round1(clamp(avgCieMarks + jitter(), 0, 30));
  const cie2 = round1(clamp(avgCieMarks + jitter(), 0, 30));
  const cie3 = round1(clamp(avgCieMarks + jitter(), 0, 30));
  const avg = round1((cie1 + cie2 + cie3) / 3);
  const total = round1(clamp(avg + assignmentMarks, 0, 50));

  return {
    attendance,
    cie1Marks: cie1,
    cie2Marks: cie2,
    cie3Marks: cie3,
    avgCieMarks: avg,
    assignmentMarks,
    totalMarks: total,
  };
}

async function seed() {
  try {
    console.log("Starting database seed...");

    const shouldReset = isTruthyEnv(process.env.DEMO_SEED_RESET);
    if (!shouldReset) {
      throw new Error(
        "Refusing to seed without DEMO_SEED_RESET=1 (to avoid duplicate demo usernames/records).",
      );
    }

    console.log("Resetting demo tables (DEMO_SEED_RESET enabled)...");
    await db.execute(sql`
      TRUNCATE TABLE
        meeting_participants,
        meetings,
        messages,
        notifications,
        self_assessments,
        academic_records,
        error_logs,
        mentees,
        mentors,
        users,
        subjects,
        session
      RESTART IDENTITY CASCADE;
    `);

    const rng = mulberry32(20260211);

    const academicYearStart = 2025;
    const academicYear = `${academicYearStart}-${academicYearStart + 1}`;

    const mentorNamePool = [
      "Aditi Kulkarni",
      "Rohan Desai",
      "Meera Nair",
      "Arjun Shetty",
      "Neha Iyer",
    ] as const;

    const menteeFirstNames = [
      "Ananya",
      "Karan",
      "Sneha",
      "Vivek",
      "Pooja",
      "Rahul",
      "Isha",
      "Nikhil",
      "Priya",
      "Siddharth",
      "Aarav",
      "Diya",
    ] as const;

    const menteeLastNames = [
      "Patil",
      "Sharma",
      "Rao",
      "Bhat",
      "Shetty",
      "Nair",
      "Gupta",
      "Kumar",
      "Joshi",
      "Iyer",
    ] as const;

    const departmentOptions = [
      { department: "Computer Science and Engineering", specialization: "Software Engineering" },
      { department: "Computer Science and Engineering", specialization: "AI & ML" },
      { department: "Information Science and Engineering", specialization: "Data Engineering" },
      { department: "Information Science and Engineering", specialization: "Cloud Computing" },
      { department: "Electronics and Communication Engineering", specialization: "Embedded Systems" },
    ] as const;

    const subjectsBySemester: Record<number, Array<{ code: string; name: string }>> = {
      1: [
        { code: "CS101", name: "Programming Fundamentals" },
        { code: "CS102", name: "Engineering Mathematics I" },
        { code: "CS103", name: "Basic Electrical Engineering" },
      ],
      2: [
        { code: "CS201", name: "Object Oriented Programming" },
        { code: "CS202", name: "Engineering Mathematics II" },
        { code: "CS203", name: "Data Structures" },
      ],
      3: [
        { code: "CS301", name: "Database Management Systems" },
        { code: "CS302", name: "Computer Organization" },
        { code: "CS303", name: "Discrete Mathematics" },
      ],
      4: [
        { code: "CS401", name: "Operating Systems" },
        { code: "CS402", name: "Design and Analysis of Algorithms" },
        { code: "CS403", name: "Computer Networks" },
      ],
      5: [
        { code: "CS501", name: "Software Engineering" },
        { code: "CS502", name: "Web Technologies" },
        { code: "CS503", name: "Theory of Computation" },
      ],
      6: [
        { code: "CS601", name: "Machine Learning" },
        { code: "CS602", name: "Cloud Computing" },
        { code: "CS603", name: "Information Security" },
      ],
      7: [
        { code: "CS701", name: "Big Data Analytics" },
        { code: "CS702", name: "DevOps" },
        { code: "CS703", name: "Mobile Application Development" },
      ],
      8: [
        { code: "CS801", name: "Project Work" },
        { code: "CS802", name: "Advanced Topics in Computing" },
        { code: "CS803", name: "Professional Ethics" },
      ],
    };

    const adminUsername = "admin";
    const mentorPasswordPlain = process.env.DEMO_MENTOR_PASSWORD ?? "mentor123";
    const menteePasswordPlain = process.env.DEMO_MENTEE_PASSWORD ?? "mentee123";
    const adminPasswordPlain = process.env.DEMO_ADMIN_PASSWORD ?? "admin123";

    const mentorPasswordHash = await hashPassword(mentorPasswordPlain);
    const menteePasswordHash = await hashPassword(menteePasswordPlain);

    // --- Users ---
    const [adminUser] = await db.insert(schema.users).values({
      username: adminUsername,
      password: await hashPassword(adminPasswordPlain),
      role: schema.UserRole.ADMIN,
      name: "Demo Admin",
      email: "admin@example.edu",
    }).returning();

    // 5 mentors: mentor, mentor2..mentor5
    const mentorUsers = await db.insert(schema.users).values(
      Array.from({ length: 5 }).map((_, i) => {
        const username = i === 0 ? "mentor" : `mentor${i + 1}`;
        const name = mentorNamePool[i] ?? `Mentor ${i + 1}`;
        return {
          username,
          password: mentorPasswordHash,
          role: schema.UserRole.MENTOR,
          name: `Dr. ${name}`,
          email: `${username}@example.edu`,
        };
      })
    ).returning();

    const mentorRecords = await db.insert(schema.mentors).values(
      mentorUsers.map((user, i) => {
        const dept = departmentOptions[i] ?? departmentOptions[i % departmentOptions.length];
        return {
          userId: user.id,
          department: dept.department,
          specialization: dept.specialization,
          mobileNumber: `9${String(880000000 + i).padStart(9, "0")}`,
          isActive: true,
        };
      })
    ).returning();

    // 20 mentees: mentee, mentee02..mentee20
    const menteeUsers = await db.insert(schema.users).values(
      Array.from({ length: 20 }).map((_, i) => {
        const username = i === 0 ? "mentee" : `mentee${String(i + 1).padStart(2, "0")}`;
        const name = `${pickOne(rng, menteeFirstNames)} ${pickOne(rng, menteeLastNames)}`;
        return {
          username,
          password: menteePasswordHash,
          role: schema.UserRole.MENTEE,
          name,
          email: `${username}@example.edu`,
        };
      })
    ).returning();

    const menteeRecords = await db.insert(schema.mentees).values(
      menteeUsers.map((user, i) => {
        const semester = (i % 8) + 1;
        const mentorIndex = i % mentorRecords.length;
        // Joining year depends on current semester (2 semesters per academic year)
        // For seeded academic year 2025-2026:
        // Sem 1-2 => 2025 join, 3-4 => 2024, 5-6 => 2023, 7-8 => 2022
        const joinYear = academicYearStart - Math.floor((semester - 1) / 2);
        const joinYear2 = String(joinYear % 100).padStart(2, "0");
        const collegeCode = "1AB";
        const branchCode = "CS";
        const usn = `${collegeCode}${joinYear2}${branchCode}${String(i + 1).padStart(3, "0")}`;
        const section = (i % 3) === 0 ? "A" : (i % 3) === 1 ? "B" : "C";
        return {
          userId: user.id,
          usn,
          mentorId: mentorRecords[mentorIndex].id,
          semester,
          section,
          mobileNumber: `9${String(770000000 + i).padStart(9, "0")}`,
          parentMobileNumber: `9${String(660000000 + i).padStart(9, "0")}`,
          isActive: true,
        };
      })
    ).returning();

    // --- Subjects ---
    const subjectRows: Array<{ code: string; name: string; semester: number }> = [];
    for (let semester = 1; semester <= 8; semester++) {
      const list = subjectsBySemester[semester] ?? [];
      for (const item of list) {
        subjectRows.push({ code: item.code, name: item.name, semester });
      }
    }

    const subjects = await db.insert(schema.subjects).values(subjectRows).returning();

    // --- Academic Records ---
    const recordsToInsert: Array<schema.InsertAcademicRecord> = [];

    for (let i = 0; i < menteeRecords.length; i++) {
      const mentee = menteeRecords[i];
      const profile = pickProfile(i);
      const semesterSubjects = subjects.filter((s) => s.semester === mentee.semester);

      for (const subject of semesterSubjects) {
        const { attendance, ...marks } = generateMarksAndAttendance(rng, profile);
        recordsToInsert.push({
          menteeId: mentee.id,
          subjectId: subject.id,
          semester: mentee.semester,
          academicYear,
          attendance,
          ...marks,
        });
      }
    }

    await db.insert(schema.academicRecords).values(recordsToInsert);

    // --- Notifications ---
    await db.insert(schema.notifications).values([
      {
        message: "Welcome to MentorConnect (demo). Use seeded accounts to explore the app.",
        isRead: false,
        isUrgent: false,
        targetRoles: ["all"],
      },
      {
        message: "Mentors: Check your at-risk mentees list (attendance < 85%).",
        isRead: false,
        isUrgent: true,
        targetRoles: [schema.UserRole.MENTOR],
      },
      {
        message: "Mentees: Please submit your self-assessment for this semester.",
        isRead: false,
        isUrgent: false,
        targetRoles: [schema.UserRole.MENTEE],
      },
      {
        message: "Admin: Demo data seeded successfully.",
        isRead: false,
        isUrgent: false,
        targetRoles: [schema.UserRole.ADMIN],
        targetUserId: adminUser.id,
      },
    ]);

    // --- Self Assessments (for all mentees) ---
    await db.insert(schema.selfAssessments).values(
      menteeRecords.map((m, idx) => ({
        menteeId: m.id,
        academicGoals: `Improve consistency and attendance (student ${idx + 1}).`,
        careerAspirations: "Become a software engineer.",
        strengths: "Problem solving",
        areasToImprove: "Time management",
        studyHoursPerDay: round1(1 + rng() * 4),
        stressLevel: Math.floor(1 + rng() * 5),
        academicConfidence: pickOne(rng, ["very_low", "low", "moderate", "high", "very_high"] as const),
        challenges: "Balancing assignments and exams",
        supportNeeded: "Guidance on study plan and resources",
      }))
    );

    // --- Messages (admin-mentor + mentor group chat) ---
    const messageRows: Array<schema.InsertMessage> = [];
    for (let i = 0; i < mentorRecords.length; i++) {
      const mentor = mentorRecords[i];
      const mentorUser = mentorUsers[i];

      // Admin -> Mentor (private)
      messageRows.push({
        senderId: adminUser.id,
        receiverId: mentorUser.id,
        mentorId: null,
        content: `Hello ${mentorUser.username}, this is a demo admin message.`,
        isRead: false,
        isGroupMessage: false,
        isAdminMentorMessage: true,
      });

      // Mentor group chat message
      messageRows.push({
        senderId: mentorUser.id,
        receiverId: null,
        mentorId: mentor.id,
        content: `Welcome mentees! (Group chat for mentor ${mentorUser.username})`,
        isRead: false,
        isGroupMessage: true,
        isAdminMentorMessage: false,
      });
    }

    await db.insert(schema.messages).values(messageRows);

    // --- Meetings + participants ---
    const meetingsToInsert: Array<schema.InsertMeeting> = [];
    for (let i = 0; i < mentorRecords.length; i++) {
      const mentor = mentorRecords[i];
      meetingsToInsert.push({
        mentorId: mentor.id,
        type: schema.MeetingType.ONE_TO_ONE,
        title: "One-to-one mentorship check-in",
        description: "Demo meeting created by seed",
        location: "Online",
        scheduledAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        durationMinutes: 30,
        status: schema.MeetingStatus.SCHEDULED,
      });
      meetingsToInsert.push({
        mentorId: mentor.id,
        type: schema.MeetingType.MANY_TO_ONE,
        title: "Group guidance session",
        description: "Demo completed meeting",
        location: "Room 101",
        scheduledAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: schema.MeetingStatus.COMPLETED,
      });
    }

    const insertedMeetings = await db.insert(schema.meetings).values(meetingsToInsert).returning();

    const participantsToInsert: Array<schema.InsertMeetingParticipant> = [];
    for (const meeting of insertedMeetings) {
      const menteesForMentor = menteeRecords.filter((m) => m.mentorId === meeting.mentorId);
      const pickCount = meeting.type === schema.MeetingType.ONE_TO_ONE ? 1 : Math.min(3, menteesForMentor.length);
      for (let i = 0; i < pickCount; i++) {
        const mentee = menteesForMentor[(i + meeting.id) % menteesForMentor.length];
        participantsToInsert.push({
          meetingId: meeting.id,
          menteeId: mentee.id,
          attended: meeting.status === schema.MeetingStatus.COMPLETED ? rng() > 0.2 : false,
          remarks: meeting.status === schema.MeetingStatus.COMPLETED ? "Good discussion" : null,
          stars: meeting.status === schema.MeetingStatus.COMPLETED ? Math.floor(3 + rng() * 3) : null,
        });
      }
    }
    await db.insert(schema.meetingParticipants).values(participantsToInsert);

    // --- Error log (one demo entry) ---
    await db.insert(schema.errorLogs).values({
      userId: adminUser.id,
      action: "demo_seed",
      errorMessage: "Demo error log entry (seeded)",
      stackTrace: "N/A",
    });

    console.log(`Seeded: 1 admin, ${mentorRecords.length} mentors, ${menteeRecords.length} mentees, ${subjects.length} subjects, ${recordsToInsert.length} academic records`);

    console.log("Seed completed successfully");
  }
  catch (error) {
    console.error("Error during seeding:", error);
  }
}

seed();
