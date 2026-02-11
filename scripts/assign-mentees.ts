import { db } from "../db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function assignMenteesToMentors() {
  try {
    console.log("Starting mentee assignment for all semesters...");

    // Get all mentors
    const mentorRecords = await db.query.mentors.findMany();
    if (mentorRecords.length === 0) {
      throw new Error("No mentors found in the database");
    }

    // Get all subjects
    const subjectRecords = await db.query.subjects.findMany();
    
    // Check which semesters we need to add for each mentor
    for (const mentor of mentorRecords) {
      console.log(`Processing mentor ID ${mentor.id}...`);
      
      // Get existing mentee semesters for this mentor
      const existingMentees = await db.query.mentees.findMany({
        where: eq(schema.mentees.mentorId, mentor.id)
      });
      
      const existingSemesters = new Set(existingMentees.map(m => m.semester));
      console.log(`Mentor ${mentor.id} has mentees in semesters: ${Array.from(existingSemesters).join(', ')}`);
      
      // Determine which semesters are missing
      const neededSemesters = [1, 2, 3, 4, 5, 6, 7, 8].filter(sem => !existingSemesters.has(sem));
      console.log(`Mentor ${mentor.id} needs mentees in semesters: ${neededSemesters.join(', ')}`);
      
      // Add mentees for missing semesters
      for (const semester of neededSemesters) {
        // Generate mentee info
        const randomDigits = Math.floor(Math.random() * 100).toString().padStart(3, '0');
        const yearPrefix = semester <= 2 ? '22' : semester <= 4 ? '21' : semester <= 6 ? '20' : '19';
        const usn = `1SI${yearPrefix}CS${randomDigits}`;
        const name = `Student ${usn}`;
        
        // Create user
        const username = usn.toLowerCase();
        const password = await hashPassword(username);
        
        const menteeUser = await db.insert(schema.users).values({
          username,
          password,
          role: schema.UserRole.MENTEE,
          name,
          email: `${username}@college.edu`,
        }).returning();

        // Create mentee record
        const section = Math.random() < 0.5 ? 'A' : 'B';
        const menteeRecord = await db.insert(schema.mentees).values({
          userId: menteeUser[0].id,
          usn,
          semester,
          section,
          mentorId: mentor.id,
          mobileNumber: "9876543210",
          parentMobileNumber: "9876543211",
          isActive: true,
        }).returning();

        console.log(`Created mentee: ${menteeUser[0].name} (Semester ${semester}) for Mentor ${mentor.id}`);

        // Add academic records
        const semesterSubjects = subjectRecords.filter(s => s.semester === semester);
        
        // If no subjects for this semester, create one
        if (semesterSubjects.length === 0) {
          // Check if a subject with this code already exists
          const subjectCode = `CS${semester}01`;
          const existingSubject = await db.query.subjects.findFirst({
            where: eq(schema.subjects.code, subjectCode)
          });
          
          if (existingSubject) {
            console.log(`Using existing subject: ${existingSubject.name} for semester ${semester}`);
            semesterSubjects.push(existingSubject);
          } else {
            const uniqueCode = `CS${semester}${Math.floor(Math.random() * 90) + 10}`;
            const newSubject = await db.insert(schema.subjects).values({
              code: uniqueCode,
              name: `Subject for Semester ${semester}`,
              semester
            }).returning();
            
            console.log(`Created new subject: ${newSubject[0].name} for semester ${semester}`);
            semesterSubjects.push(newSubject[0]);
          }
        }
        
        // Create academic records for each subject
        for (const subject of semesterSubjects) {
          // Generate random marks and attendance
          const attendance = 75 + Math.random() * 20; // 75-95%
          const cieMarks = Math.floor(Math.random() * 21) + 30; // 30-50
          const assignmentMarks = Math.floor(Math.random() * 21) + 30; // 30-50
          const totalMarks = cieMarks + assignmentMarks;

          await db.insert(schema.academicRecords).values({
            menteeId: menteeRecord[0].id,
            subjectId: subject.id,
            cie1Marks: cieMarks,
            assignmentMarks,
            totalMarks,
            attendance,
            semester,
            academicYear: "2023-2024",
          });

          console.log(`Created academic record for ${menteeUser[0].name} in ${subject.name}`);
        }
      }
    }

    console.log("Mentee assignment completed successfully");
  }
  catch (error) {
    console.error("Error during mentee assignment:", error);
  }
}

assignMenteesToMentors();
