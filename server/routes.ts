import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { chatWithAI, logAIChat, analyzeImage, handleImageUpload, uploadImage, generateImage } from "./ai";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertCourseSchema, 
  insertModuleSchema,
  insertLessonSchema,
  insertExamSchema,
  insertQuestionSchema,
  insertExamAttemptSchema,
  insertEnrollmentSchema,
  insertActivityLogSchema,
  insertBatchSchema,
  insertBatchEnrollmentSchema,
  insertLessonProgressSchema
} from "@shared/schema";
import { parseQuestionsFromText, parseQuestionsFromDocx, extractImagesFromPdfBuffer } from "./pdf-questions";
import { PDFParse } from "pdf-parse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));
  
  // Set up authentication routes and middleware
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is an admin
  const isAdmin = (req: any, res: any, next: any) => {
    if (
      req.isAuthenticated() &&
      (req.user!.role === "admin" || req.user!.role === "superadmin")
    ) {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Admin access required" });
  };

  // Middleware to check if user is a super admin
  const isSuperAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user!.role === "superadmin") {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Super Admin access required" });
  };

  // Tenant routes
  app.get("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      const tenants = await storage.getTenant(req.user!.tenantId);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // User routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersByTenant(req.user!.tenantId);
      // Remove passwords before sending
      const safeUsers = users.map(({ password, ...rest }) => rest);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get a specific user by ID
  app.get("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user belongs to the admin's tenant
      if (user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this user" });
      }
      
      // Remove password before sending
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update user profile
  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only update their own profile unless they are admins
      if (userId !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      const { password, ...updateData } = req.body;
      
      // If password is provided, hash it
      let userData: any = { ...updateData };
      if (password) {
        // This references the hashPassword function from auth.ts
        // We'll need to import it or redefine it here
        const crypto = require('crypto');
        const { promisify } = require('util');
        const scrypt = promisify(crypto.scrypt);
        
        // Hash the password
        const salt = crypto.randomBytes(16).toString('hex');
        const buf = await scrypt(password, salt, 64) as Buffer;
        const hashedPassword = `${buf.toString('hex')}.${salt}`;
        
        userData.password = hashedPassword;
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password before sending the response
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
      
    } catch (error) {
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  // Admin create student (does not switch login session)
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const {
        username,
        password,
        firstName,
        lastName,
        email,
        mobileNumber,
        gender,
        dateOfBirth,
        educationLevel,
        schoolCollege,
        yearOfStudy,
      } = req.body;

      if (
        !username ||
        !password ||
        !firstName ||
        !lastName ||
        !email ||
        !mobileNumber ||
        !dateOfBirth ||
        !educationLevel ||
        !schoolCollege ||
        !yearOfStudy
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        plainPassword: password,
        firstName,
        lastName,
        email,
        mobileNumber,
        gender: gender || null,
        dateOfBirth:
          typeof dateOfBirth === "string"
            ? dateOfBirth
            : new Date(dateOfBirth).toISOString().slice(0, 10),
        educationLevel,
        schoolCollege,
        yearOfStudy,
        role: "student",
        tenantId: req.user!.tenantId,
      });

      const { password: _, plainPassword: __, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Failed to create student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // DELETE user route
app.delete("/api/users/:id", isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if user exists and belongs to the same tenant
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user belongs to the admin's tenant
    // The isAdmin middleware ensures req.user! exists, so we can safely access it
    if (user.tenantId !== req.user!.tenantId) {
      return res.status(403).json({ message: "Access denied to this user" });
    }
    
    // Prevent admin from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    
    // Delete the user and all related data
    await storage.deleteUser(userId);
    
    res.status(200).json({ 
      message: `User ${user.firstName} ${user.lastName} has been deleted successfully` 
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

  // Course routes
  app.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.getCoursesByTenant(req.user!.tenantId);
      
      // If user is admin or superadmin, return courses with enrollment counts
      if (req.user!.role === "admin" || req.user!.role === "superadmin") {
        const counts = await storage.getEnrollmentCountsByTenant(req.user!.tenantId);
        const withCounts = courses.map((course) => ({
          ...course,
          enrollmentCount: counts[course.id] ?? 0,
        }));
        res.json(withCounts);
        return;
      }
      
      // Students only see courses assigned/enrolled by admin
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));
      const assignedCourses = courses.filter((course) => enrolledCourseIds.has(course.id));
      
      res.json(assignedCourses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if course belongs to user's tenant
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      // If user is admin or superadmin, allow access
      if (req.user!.role === "admin" || req.user!.role === "superadmin") {
        res.json(course);
        return;
      }
      
      // Students must be enrolled/assigned to access the course
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const isEnrolled = enrollments.some((enrollment) => enrollment.courseId === courseId);
      
      if (!isEnrolled) {
        return res.status(403).json({ 
          message: "This course is not assigned to you. Please contact an administrator." 
        });
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post("/api/courses", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCourseSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.id
      });
      
      const course = await storage.createCourse(validatedData);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.put("/api/courses/:id", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if course belongs to user's tenant
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      const updatedCourse = await storage.updateCourse(courseId, req.body);
      res.json(updatedCourse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if course belongs to user's tenant
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      await storage.deleteCourse(courseId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Module routes
  app.get("/api/courses/:courseId/modules", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if course belongs to user's tenant
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      // If user is admin or superadmin, allow access
      if (req.user!.role === "admin" || req.user!.role === "superadmin") {
        const modules = await storage.getModulesByCourse(courseId);
        res.json(modules);
        return;
      }
      
      // Students must be enrolled/assigned to access modules
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const isEnrolled = enrollments.some(enrollment => enrollment.courseId === courseId);
      
      if (!isEnrolled) {
        return res.status(403).json({ 
          message: "This course is not assigned to you. Please contact an administrator." 
        });
      }
      
      const modules = await storage.getModulesByCourse(courseId);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.post("/api/modules", isAdmin, async (req, res) => {
    try {
      const validatedData = insertModuleSchema.parse(req.body);
      
      // Check if course belongs to user's tenant
      const course = await storage.getCourse(validatedData.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      const module = await storage.createModule(validatedData);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.put("/api/modules/:id", isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Check if module's course belongs to user's tenant
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this module" });
      }
      
      const updatedModule = await storage.updateModule(moduleId, req.body);
      res.json(updatedModule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  app.delete("/api/modules/:id", isAdmin, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Check if module's course belongs to user's tenant
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this module" });
      }
      
      await storage.deleteModule(moduleId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  // Lesson routes
  app.get("/api/modules/:moduleId/lessons", isAuthenticated, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const module = await storage.getModule(moduleId);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Check if module's course belongs to user's tenant
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this module" });
      }
      
      const lessons = await storage.getLessonsByModule(moduleId);
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post("/api/lessons", isAdmin, async (req, res) => {
    try {
      const validatedData = insertLessonSchema.parse(req.body);
      
      // Check if module's course belongs to user's tenant
      const module = await storage.getModule(validatedData.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this module" });
      }
      
      const lesson = await storage.createLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put("/api/lessons/:id", isAdmin, async (req, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if lesson's module's course belongs to user's tenant
      const module = await storage.getModule(lesson.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this lesson" });
      }
      
      const updatedLesson = await storage.updateLesson(lessonId, req.body);
      res.json(updatedLesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", isAdmin, async (req, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if lesson's module's course belongs to user's tenant
      const module = await storage.getModule(lesson.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this lesson" });
      }
      
      await storage.deleteLesson(lessonId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Enrollment routes
  app.get("/api/enrollments/user", isAuthenticated, async (req, res) => {
    try {
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);

      // Include course titles so student UI never falls back to "Course #id"
      const enhanced = [];
      for (const enrollment of enrollments) {
        const course = await storage.getCourse(enrollment.courseId);
        enhanced.push({
          ...enrollment,
          course: course
            ? {
                id: course.id,
                title: course.title,
                description: course.description,
                thumbnail: course.thumbnail,
                difficulty: course.difficulty,
                duration: course.duration,
                category: course.category,
              }
            : null,
        });
      }

      res.json(enhanced);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });
  
  // Get enrollments for a specific user (admin only)
  app.get("/api/enrollments/user/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user belongs to the same tenant
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this user's enrollments" });
      }
      
      const enrollments = await storage.getEnrollmentsByUser(userId);
      
      // Enhance enrollments with course data
      const enhancedEnrollments = [];
      for (const enrollment of enrollments) {
        const course = await storage.getCourse(enrollment.courseId);
        enhancedEnrollments.push({
          ...enrollment,
          course: course
        });
      }
      
      res.json(enhancedEnrollments);
    } catch (error) {
      console.error("Failed to fetch enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get("/api/enrollments/course/:courseId", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if course belongs to user's tenant
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      const enrollments = await storage.getEnrollmentsByCourse(courseId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.post("/api/enrollments", isAuthenticated, async (req, res) => {
    try {
      // Only admins can enroll students; students get courses via admin assignment
      if (req.user!.role !== "admin" && req.user!.role !== "superadmin") {
        return res.status(403).json({
          message: "Courses must be assigned by an administrator.",
        });
      }

      const { userId, courseId } = req.body;
      const targetUserId = userId || req.user!.id;

      const validatedData = insertEnrollmentSchema.parse({
        courseId,
        userId: targetUserId,
      });
      
      // Check if course belongs to user's tenant
      const course = await storage.getCourse(validatedData.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      // Check if already enrolled
      const existingEnrollments = await storage.getEnrollmentsByUser(validatedData.userId);
      const alreadyEnrolled = existingEnrollments.some(e => e.courseId === validatedData.courseId);
      
      if (alreadyEnrolled) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }
      
      const enrollment = await storage.createEnrollment(validatedData);
      
      // Create activity log
      await storage.createActivityLog({
        userId: validatedData.userId,
        activityType: "course_enroll",
        resourceId: validatedData.courseId,
        resourceType: "course",
        tenantId: req.user!.tenantId
      });
      
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  app.put("/api/enrollments/:id", isAuthenticated, async (req, res) => {
    try {
      const enrollmentId = parseInt(req.params.id);
      const enrollment = await storage.getEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      // Check if enrollment belongs to user or user is admin
      if (enrollment.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied to this enrollment" });
      }
      
      const updatedEnrollment = await storage.updateEnrollment(enrollmentId, req.body);
      res.json(updatedEnrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update enrollment" });
    }
  });
  
  // Endpoint for admin to assign courses to students
  app.post("/api/enrollments/assign", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(String(req.body?.userId), 10);
      const courseId = parseInt(String(req.body?.courseId), 10);

      if (!Number.isFinite(userId) || !Number.isFinite(courseId)) {
        return res.status(400).json({ message: "Both userId and courseId are required" });
      }

      // Check if course exists and belongs to admin's tenant
      const course = await storage.getCourse(courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Course not found or access denied" });
      }

      // Check if user exists and belongs to admin's tenant
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "User not found or access denied" });
      }

      if (user.role !== "student") {
        return res.status(400).json({ message: "Courses can only be assigned to students" });
      }

      // Idempotent: already enrolled is success (supports batch assign)
      const existingEnrollments = await storage.getEnrollmentsByUser(userId);
      const existing = existingEnrollments.find((e) => e.courseId === courseId);
      if (existing) {
        return res.status(200).json(existing);
      }

      const enrollment = await storage.createEnrollment({
        userId,
        courseId,
      });

      try {
        await storage.createActivityLog({
          userId,
          activityType: "course_assign",
          resourceId: courseId,
          resourceType: "course",
          tenantId: req.user!.tenantId,
        });
      } catch (logError) {
        console.error("Activity log failed after course assign:", logError);
      }

      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Failed to assign course to user:", error);
      res.status(500).json({ message: "Failed to assign course to user" });
    }
  });

  // Admin unenroll student from course
  app.delete("/api/enrollments/assign", isAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const userId = parseInt(String(body.userId ?? req.query.userId), 10);
      const courseId = parseInt(String(body.courseId ?? req.query.courseId), 10);

      if (!Number.isFinite(userId) || !Number.isFinite(courseId)) {
        return res.status(400).json({ message: "Both userId and courseId are required" });
      }

      const course = await storage.getCourse(courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Course not found or access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "User not found or access denied" });
      }

      const lockedCourseIds = await storage.getCourseIdsLockedByBatchForUser(userId);
      if (lockedCourseIds.includes(courseId)) {
        return res.status(400).json({
          message:
            "This course is assigned through a batch. Remove the student from the batch first, or keep this course enrolled.",
          lockedByBatch: true,
        });
      }

      const deleted = await storage.deleteEnrollmentByUserAndCourse(userId, courseId);
      if (!deleted) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      res.json({ message: "Enrollment removed" });
    } catch (error) {
      console.error("Failed to remove enrollment:", error);
      res.status(500).json({ message: "Failed to remove enrollment" });
    }
  });

  // Courses locked for a student because they come from batch membership
  app.get("/api/enrollments/user/:userId/batch-locked-courses", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "User not found or access denied" });
      }
      const courseIds = await storage.getCourseIdsLockedByBatchForUser(userId);
      res.json({ userId, courseIds });
    } catch (error) {
      console.error("Failed to fetch batch-locked courses:", error);
      res.status(500).json({ message: "Failed to fetch batch-locked courses" });
    }
  });

  // Students locked for a course because they get it via batch membership
  app.get("/api/enrollments/course/:courseId/batch-locked-users", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId, 10);
      const course = await storage.getCourse(courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Course not found or access denied" });
      }
      const userIds = await storage.getUserIdsLockedByBatchForCourse(courseId);
      res.json({ courseId, userIds });
    } catch (error) {
      console.error("Failed to fetch batch-locked users:", error);
      res.status(500).json({ message: "Failed to fetch batch-locked users" });
    }
  });

  // Exam routes
  app.get("/api/exams", isAuthenticated, async (req, res) => {
    try {
      const exams = await storage.getExamsByTenant(req.user!.tenantId);

      if (req.user!.role === "admin" || req.user!.role === "superadmin") {
        res.json(exams);
        return;
      }

      // Students see published exams for any course they are enrolled in.
      // batchId is used for admin targeting/reporting; course enrollment is the
      // access gate so students already assigned to the course can always take it.
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

      const assignedExams = exams.filter(
        (exam) =>
          enrolledCourseIds.has(exam.courseId) && exam.acceptingResponses !== false
      );
      res.json(assignedExams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  // Question image upload endpoint (admin only)
  const questionImageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "questions");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `q-img-${uniqueSuffix}${ext}`);
    },
  });

  const questionImageUpload = multer({
    storage: questionImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype) || /\.(png|jpe?g|webp|gif)$/i.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files (PNG, JPG, JPEG, WEBP, GIF) are allowed"));
      }
    },
  });

  app.post(
    "/api/exams/upload-question-image",
    isAdmin,
    questionImageUpload.single("image"),
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No image file provided" });
        }
        const imageUrl = `/uploads/questions/${req.file.filename}`;
        res.json({ imageUrl });
      } catch (error: any) {
        res.status(500).json({ message: error?.message || "Failed to upload image" });
      }
    }
  );

  // Parse questions document (PDF or Word .docx) into structured question/answer items (admin only)
  const questionsDocUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = file.originalname.toLowerCase();
      if (
        file.mimetype === "application/pdf" ||
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.mimetype === "application/msword" ||
        ext.endsWith(".pdf") ||
        ext.endsWith(".docx") ||
        ext.endsWith(".doc")
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF (.pdf) and Word (.docx) files are allowed"));
      }
    },
  });

  const handleDocumentParse = async (req: any, res: any) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: "Document file is required" });
      }

      const fileName = req.file.originalname || "";
      const isDocx =
        fileName.toLowerCase().endsWith(".docx") ||
        fileName.toLowerCase().endsWith(".doc") ||
        req.file.mimetype.includes("word");

      let questions: any[] = [];
      let pageCount = 1;

      if (isDocx) {
        questions = await parseQuestionsFromDocx(req.file.buffer);
      } else {
        const parser = new PDFParse({ data: req.file.buffer });
        try {
          const textResult = await parser.getText();
          questions = parseQuestionsFromText(textResult.text || "");
          pageCount = textResult.total ?? textResult.pages?.length ?? 1;

          // Extract embedded JPEG images from PDF and assign if available
          const extractedPdfImages = extractImagesFromPdfBuffer(req.file.buffer);
          if (extractedPdfImages.length > 0 && questions.length > 0) {
            let imgIdx = 0;
            for (let i = 0; i < questions.length && imgIdx < extractedPdfImages.length; i++) {
              const q = questions[i];
              const mentionsImage = /(picture|image|figure|diagram|triangle|shape|graph|photo|shown|below)/i.test(q.text);
              if (!q.imageUrl && (mentionsImage || extractedPdfImages.length === questions.length)) {
                q.imageUrl = extractedPdfImages[imgIdx++];
              }
            }
          }
        } finally {
          await parser.destroy().catch(() => undefined);
        }
      }

      if (questions.length === 0) {
        return res.status(422).json({
          message:
            "No questions found. Use numbered items like Q1. / 1. / Question 1: and optional Answer: lines.",
          questions: [],
          pageCount,
        });
      }

      res.json({
        questions,
        total: questions.length,
        pageCount,
        fileName: req.file.originalname,
      });
    } catch (error: any) {
      console.error("Failed to parse questions document:", error);
      res.status(500).json({
        message: error?.message || "Failed to parse document",
      });
    }
  };

  app.post(
    "/api/exams/parse-questions-pdf",
    isAdmin,
    (req, res, next) => {
      questionsDocUpload.single("file")(req, res, (err) => {
        if (err) {
          return res.status(400).json({ message: err.message || "Upload failed" });
        }
        next();
      });
    },
    handleDocumentParse
  );

  app.post(
    "/api/exams/parse-questions-file",
    isAdmin,
    (req, res, next) => {
      questionsDocUpload.single("file")(req, res, (err) => {
        if (err) {
          return res.status(400).json({ message: err.message || "Upload failed" });
        }
        next();
      });
    },
    handleDocumentParse
  );

  app.get("/api/exams/:id", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }

      if (req.user!.role !== "admin" && req.user!.role !== "superadmin") {
        const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
        const isEnrolled = enrollments.some((e) => e.courseId === exam.courseId);
        if (!isEnrolled) {
          return res.status(403).json({
            message: "This exam is not available for your assigned courses.",
          });
        }
      }
      
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.post("/api/exams", isAdmin, async (req, res) => {
    try {
      const validatedData = insertExamSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.id,
        courseId: Number(req.body.courseId),
        duration: req.body.duration != null ? Number(req.body.duration) : 60,
        batchId:
          req.body.batchId === null ||
          req.body.batchId === undefined ||
          req.body.batchId === "" ||
          req.body.batchId === "none"
            ? null
            : Number(req.body.batchId),
      });
      
      // Check if course belongs to user's tenant
      const course = await storage.getCourse(validatedData.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }

      if (validatedData.batchId) {
        const batch = await storage.getBatch(validatedData.batchId);
        if (!batch || batch.tenantId !== req.user!.tenantId) {
          return res.status(403).json({ message: "Access denied to this batch" });
        }
        
        // Check if the selected course is assigned to this batch
        const batchCourseIds = await storage.getBatchCourseIds(validatedData.batchId);
        if (!batchCourseIds.includes(validatedData.courseId)) {
          return res.status(400).json({
            message: "This batch doesn't have access to the selected course. Please assign the course to this batch first or choose a different batch.",
          });
        }
      }
      
      const exam = await storage.createExam(validatedData);
      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Failed to create exam:", error);
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  app.put("/api/exams/:id", isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      // Validate the request body
      const updateSchema = z.object({
        title: z.string().min(3).optional(),
        description: z.string().min(1).optional(),
        courseId: z.number().positive().optional(),
        duration: z.number().min(1).max(600).optional(),
        batchId: z.number().positive().nullable().optional(),
        maxAttempts: z.number().min(1).optional(),
        startTime: z.string().transform(str => new Date(str)).optional(),
        endTime: z.string().transform(str => new Date(str)).optional(),
        acceptingResponses: z.boolean().optional(),
      });
      
      const validatedData = updateSchema.parse({
        ...req.body,
        courseId: req.body.courseId != null ? Number(req.body.courseId) : undefined,
        duration: req.body.duration != null ? Number(req.body.duration) : undefined,
        batchId:
          req.body.batchId === undefined
            ? undefined
            : req.body.batchId === null ||
                req.body.batchId === "" ||
                req.body.batchId === "none"
              ? null
              : Number(req.body.batchId),
      });

      if (validatedData.batchId) {
        const batch = await storage.getBatch(validatedData.batchId);
        if (!batch || batch.tenantId !== req.user!.tenantId) {
          return res.status(403).json({ message: "Access denied to this batch" });
        }
        const courseId = validatedData.courseId ?? exam.courseId;
        
        // Check if the selected course is assigned to this batch
        const batchCourseIds = await storage.getBatchCourseIds(validatedData.batchId);
        if (!batchCourseIds.includes(courseId)) {
          return res.status(400).json({
            message: "This batch doesn't have access to the selected course. Please assign the course to this batch first or choose a different batch.",
          });
        }
      }
      
      const updatedExam = await storage.updateExam(examId, validatedData);
      res.json(updatedExam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Failed to update exam:", error);
      res.status(500).json({ message: "Failed to update exam" });
    }
  });

  app.delete("/api/exams/:id", isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      await storage.deleteExam(examId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam" });
    }
  });

  // Question routes
  app.get("/api/exams/:examId/questions", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      const questions = await storage.getQuestionsByExam(examId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });
  
  // Add a route for bulk deleting questions for an exam
  app.delete("/api/exams/:examId/questions", isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      // Get all questions for this exam
      const questions = await storage.getQuestionsByExam(examId);
      
      // Delete each question
      for (const question of questions) {
        await storage.deleteQuestion(question.id);
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete questions" });
    }
  });
  
  // Add a route for adding questions to an exam directly
  app.post("/api/exams/:examId/questions", isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      // Get existing questions count to calculate order
      const existingQuestions = await storage.getQuestionsByExam(examId);
      const nextOrder = existingQuestions.length;
      
      const questionData = {
        examId,
        text: req.body.text,
        order: req.body.order !== undefined ? req.body.order : nextOrder,
        modelAnswer: req.body.modelAnswer ?? null,
        imageUrl: req.body.imageUrl ?? null,
      };
      
      const validatedData = insertQuestionSchema.parse(questionData);
      const question = await storage.createQuestion(validatedData);
      
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Failed to create question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.post("/api/questions", isAdmin, async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      
      // Check if exam belongs to user's tenant
      const exam = await storage.getExam(validatedData.examId);
      if (!exam || exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      const question = await storage.createQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/questions/:id", isAdmin, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Check if question's exam belongs to user's tenant
      const exam = await storage.getExam(question.examId);
      if (!exam || exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this question" });
      }
      
      const updatedQuestion = await storage.updateQuestion(questionId, req.body);
      res.json(updatedQuestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/questions/:id", isAdmin, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Check if question's exam belongs to user's tenant
      const exam = await storage.getExam(question.examId);
      if (!exam || exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this question" });
      }
      
      await storage.deleteQuestion(questionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Exam attempt routes
  app.get("/api/exam-attempts/user", isAuthenticated, async (req, res) => {
    try {
      const attempts = await storage.getExamAttemptsByUser(req.user!.id);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam attempts" });
    }
  });
  
  // Get exam attempts for a specific user (admin only)
  app.get("/api/exam-attempts/user/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user belongs to the same tenant
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this user's exam attempts" });
      }
      
      const attempts = await storage.getExamAttemptsByUser(userId);
      
      // Enhance attempts with exam data
      const enhancedAttempts = [];
      for (const attempt of attempts) {
        const exam = await storage.getExam(attempt.examId);
        enhancedAttempts.push({
          ...attempt,
          exam: exam
        });
      }
      
      res.json(enhancedAttempts);
    } catch (error) {
      console.error("Failed to fetch exam attempts:", error);
      res.status(500).json({ message: "Failed to fetch exam attempts" });
    }
  });

  app.get("/api/exam-attempts/exam/:examId", isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.examId);
      const exam = await storage.getExam(examId);
      
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      
      // Check if exam belongs to user's tenant
      if (exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      const attempts = await storage.getExamAttemptsByExam(examId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam attempts" });
    }
  });

  app.post("/api/exam-attempts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExamAttemptSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      // Check if exam belongs to user's tenant
      const exam = await storage.getExam(validatedData.examId);
      if (!exam || exam.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this exam" });
      }
      
      // Check if exam is accepting responses
      if (exam.acceptingResponses === false) {
        return res.status(403).json({ message: "This exam is not accepting responses at this time" });
      }

      // One attempt only: block if already submitted; resume if in progress
      const userAttempts = await storage.getExamAttemptsByUser(req.user!.id);
      const forThisExam = userAttempts.filter((a) => a.examId === validatedData.examId);
      const completed = forThisExam.find((a) => a.completedAt);
      if (completed) {
        return res.status(403).json({
          message: "You have already submitted this exam. Only one attempt is allowed.",
        });
      }
      const inProgress = forThisExam.find((a) => !a.completedAt);
      if (inProgress) {
        return res.status(200).json(inProgress);
      }
      
      const attempt = await storage.createExamAttempt(validatedData);
      
      // Create activity log
      await storage.createActivityLog({
        userId: req.user!.id,
        activityType: "exam_start",
        resourceId: validatedData.examId,
        resourceType: "exam",
        tenantId: req.user!.tenantId
      });
      
      res.status(201).json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create exam attempt" });
    }
  });

  app.put("/api/exam-attempts/:id", isAuthenticated, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const attempt = await storage.getExamAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }
      
      // Check if attempt belongs to user or user is admin
      if (attempt.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied to this exam attempt" });
      }

      // One attempt: cannot modify after submit
      if (attempt.completedAt) {
        return res.status(403).json({
          message: "This exam was already submitted. Only one attempt is allowed.",
        });
      }
      
      // For assignment-style exams, we don't automatically score - instructor will review
      if (req.body.completedAt && req.body.answers) {
        const exam = await storage.getExam(attempt.examId);
        if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
        }
        const questions = await storage.getQuestionsByExam(attempt.examId);
        
        // Check if exam is still accepting responses
        if (exam.acceptingResponses === false) {
          return res.status(403).json({ message: "This exam is no longer accepting responses" });
        }
        
        // Fix the completedAt timestamp - convert string to Date object
        if (typeof req.body.completedAt === 'string') {
          req.body.completedAt = new Date(req.body.completedAt);
        }
        
        // Handle answers as JSON string or object
        if (typeof req.body.answers === 'string') {
          try {
            req.body.answers = JSON.parse(req.body.answers);
          } catch (e) {
            console.error("Error parsing answers JSON:", e);
          }
        }
        
        // Store the answers but don't calculate a score - will be reviewed by instructor
        // Set a null score to indicate it needs review
        req.body.score = null;
        
        // Create activity log
        await storage.createActivityLog({
          userId: req.user!.id,
          activityType: "exam_complete",
          resourceId: attempt.examId,
          resourceType: "exam",
          tenantId: req.user!.tenantId
        });
      }
      
      const updatedAttempt = await storage.updateExamAttempt(attemptId, req.body);
      res.json(updatedAttempt);
    } catch (error) {
      console.error("Failed to update exam attempt:", error);
      res.status(500).json({ message: "Failed to update exam attempt" });
    }
  });

  // Activity log routes
  app.get("/api/activity-logs/user", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getActivityLogsByUser(req.user!.id);
      const lessonProgressList = await storage.getLessonProgressByUser(req.user!.id);
      const progressByLessonId = new Map(
        lessonProgressList.map((p) => [p.lessonId, p] as const)
      );

      const enhanced = [];
      for (const log of logs) {
        let courseId: number | null = null;
        let courseTitle: string | null = null;
        let lessonTitle: string | null = null;
        let examTitle: string | null = null;

        if (log.activityType === "lesson_complete") {
          // Prefer lessonId (current + legacy); fall back to courseId-based logs
          const progress = progressByLessonId.get(log.resourceId);
          if (progress) {
            courseId = progress.courseId;
            const course = await storage.getCourse(progress.courseId);
            courseTitle = course?.title ?? null;
            const lesson = await storage.getLesson(log.resourceId);
            lessonTitle = lesson?.title ?? null;
          } else if (log.resourceType === "lesson") {
            const lesson = await storage.getLesson(log.resourceId);
            if (lesson) {
              lessonTitle = lesson.title;
              // Resolve course via module
              const mod = await storage.getModule(lesson.moduleId);
              if (mod) {
                courseId = mod.courseId;
                const course = await storage.getCourse(mod.courseId);
                courseTitle = course?.title ?? null;
              }
            }
          } else {
            // Older logs stored courseId
            const course = await storage.getCourse(log.resourceId);
            if (course) {
              courseId = course.id;
              courseTitle = course.title;
            }
            // Best-effort: latest completed lesson for this course near this event
            const matching = lessonProgressList
              .filter((p) => p.courseId === log.resourceId && p.completed)
              .sort(
                (a, b) =>
                  new Date(b.completedAt as any).getTime() -
                  new Date(a.completedAt as any).getTime()
              );
            if (matching[0]) {
              const lesson = await storage.getLesson(matching[0].lessonId);
              lessonTitle = lesson?.title ?? null;
            }
          }
        } else if (
          log.activityType === "course_assign" ||
          log.activityType === "course_enroll" ||
          log.activityType === "course_view" ||
          log.resourceType === "course"
        ) {
          const course = await storage.getCourse(log.resourceId);
          if (course) {
            courseId = course.id;
            courseTitle = course.title;
          }
        } else if (
          log.activityType === "exam_start" ||
          log.activityType === "exam_complete" ||
          log.resourceType === "exam"
        ) {
          const exam = await storage.getExam(log.resourceId);
          if (exam) {
            examTitle = exam.title;
            courseId = exam.courseId;
            const course = await storage.getCourse(exam.courseId);
            courseTitle = course?.title ?? null;
          }
        }

        enhanced.push({
          ...log,
          courseId,
          courseTitle,
          lessonTitle,
          examTitle,
        });
      }

      res.json(enhanced);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get("/api/activity-logs/tenant", isAdmin, async (req, res) => {
    try {
      const logs = await storage.getActivityLogsByTenant(req.user!.tenantId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Live admin dashboard aggregates (tenant-scoped)
  app.get("/api/admin/dashboard", isAdmin, async (req, res) => {
    try {
      const tenantId = Number(req.user!.tenantId);
      if (!Number.isFinite(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant" });
      }

      const users = await storage.getUsersByTenant(tenantId);
      const courses = await storage.getCoursesByTenant(tenantId);
      const exams = await storage.getExamsByTenant(tenantId);
      const logs = await storage.getActivityLogsByTenant(tenantId);
      const students = users.filter((u) => u.role === "student");
      const userById = new Map(users.map((u) => [u.id, u]));

      const enrollmentsByCourse = await Promise.all(
        courses.map(async (course) => ({
          course,
          enrollments: await storage.getEnrollmentsByCourse(course.id),
        }))
      );

      let totalEnrollments = 0;
      let progressSum = 0;
      const coursePerformance = enrollmentsByCourse
        .map(({ course, enrollments }) => {
          totalEnrollments += enrollments.length;
          const avg =
            enrollments.length === 0
              ? 0
              : Math.round(
                  enrollments.reduce((s, e) => s + (Number(e.progress) || 0), 0) /
                    enrollments.length
                );
          progressSum += avg;
          return {
            id: course.id,
            name: course.title,
            percentage: avg,
            enrolled: enrollments.length,
          };
        })
        .sort((a, b) => b.percentage - a.percentage || b.enrolled - a.enrolled)
        .slice(0, 5);

      const avgCompletion =
        courses.length === 0 ? 0 : Math.round(progressSum / courses.length);

      const signalLogs = logs.filter((l) => l.activityType !== "dashboard_view");
      const now = new Date();

      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekly: { day: string; percentage: number; count: number; isCurrentDay?: boolean }[] =
        [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const start = startOfDay(day);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        const count = signalLogs.filter((l) => {
          const t = new Date(l.timestamp as any).getTime();
          return t >= start.getTime() && t < end.getTime();
        }).length;
        weekly.push({
          day: dayNames[day.getDay()],
          count,
          percentage: 0,
          isCurrentDay: i === 0,
        });
      }
      const weekMax = Math.max(...weekly.map((d) => d.count), 1);
      weekly.forEach((d) => {
        d.percentage = Math.round((d.count / weekMax) * 100);
      });

      const thisWeekCount = weekly.reduce((s, d) => s + d.count, 0);
      const prevWeekStart = startOfDay(new Date(now));
      prevWeekStart.setDate(prevWeekStart.getDate() - 13);
      const prevWeekEnd = startOfDay(new Date(now));
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 6);
      const prevWeekCount = signalLogs.filter((l) => {
        const t = new Date(l.timestamp as any).getTime();
        return t >= prevWeekStart.getTime() && t < prevWeekEnd.getTime();
      }).length;
      const weekChangePct =
        prevWeekCount === 0
          ? thisWeekCount > 0
            ? 100
            : 0
          : Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100);

      const monthly: { day: string; percentage: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - i * 5);
        const start = new Date(end);
        start.setDate(end.getDate() - 4);
        start.setHours(0, 0, 0, 0);
        const endExclusive = new Date(end);
        endExclusive.setHours(23, 59, 59, 999);
        const count = signalLogs.filter((l) => {
          const t = new Date(l.timestamp as any).getTime();
          return t >= start.getTime() && t <= endExclusive.getTime();
        }).length;
        monthly.push({
          day: `${start.getMonth() + 1}/${start.getDate()}`,
          count,
          percentage: 0,
        });
      }
      const monthMax = Math.max(...monthly.map((d) => d.count), 1);
      monthly.forEach((d) => {
        d.percentage = Math.round((d.count / monthMax) * 100);
      });

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const yearly: { day: string; percentage: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = signalLogs.filter((l) => {
          const t = new Date(l.timestamp as any).getTime();
          return t >= start.getTime() && t < end.getTime();
        }).length;
        yearly.push({
          day: monthNames[d.getMonth()],
          count,
          percentage: 0,
        });
      }
      const yearMax = Math.max(...yearly.map((d) => d.count), 1);
      yearly.forEach((d) => {
        d.percentage = Math.round((d.count / yearMax) * 100);
      });

      const timeAgo = (ts: string | Date) => {
        const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
        if (diffMin < 10080) return `${Math.floor(diffMin / 1440)}d ago`;
        return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      };

      const recentActivities: {
        id: number;
        type: "new-course" | "exam-results" | "deadline" | "new-students" | "progress";
        title: string;
        description: string;
        time: string;
      }[] = [];

      const sortedLogs = [...signalLogs].sort(
        (a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()
      );

      for (const log of sortedLogs) {
        if (recentActivities.length >= 6) break;
        try {
          const actor = userById.get(log.userId);
          const actorName = actor
            ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.username
            : null;

          let type: "new-course" | "exam-results" | "deadline" | "new-students" | "progress" =
            "progress";
          let title = "Activity";
          let description = actorName || "System";

          if (log.activityType === "lesson_complete") {
            type = "progress";
            // resourceId may be lessonId (preferred) or courseId (legacy)
            let lessonName: string | null = null;
            let courseName: string | null = null;
            const asLesson = await storage.getLesson(log.resourceId);
            if (asLesson) {
              lessonName = asLesson.title;
              const mod = await storage.getModule(asLesson.moduleId);
              if (mod) {
                const course = await storage.getCourse(mod.courseId);
                courseName = course?.title ?? null;
              }
            } else {
              const course = await storage.getCourse(log.resourceId);
              courseName = course?.title ?? null;
            }
            title = lessonName || courseName || `Lesson #${log.resourceId}`;
            description = ["Lesson Completed", courseName, actorName]
              .filter(Boolean)
              .join(" · ");
          } else if (
            log.activityType === "exam_start" ||
            log.activityType === "exam_complete"
          ) {
            type = "exam-results";
            const exam = await storage.getExam(log.resourceId);
            const course = exam ? await storage.getCourse(exam.courseId) : null;
            title = course?.title || exam?.title || `Exam #${log.resourceId}`;
            description = [
              log.activityType === "exam_complete" ? "Exam Submitted" : "Exam Started",
              exam?.title,
              actorName,
            ]
              .filter(Boolean)
              .join(" · ");
          } else if (
            log.activityType === "course_assign" ||
            log.activityType === "course_enroll"
          ) {
            type = "new-course";
            const course = await storage.getCourse(log.resourceId);
            title = course?.title || `Course #${log.resourceId}`;
            description = [
              log.activityType === "course_assign" ? "Course Assigned" : "Student Enrolled",
              actorName,
            ]
              .filter(Boolean)
              .join(" · ");
          } else {
            continue;
          }

          recentActivities.push({
            id: log.id,
            type,
            title,
            description,
            time: timeAgo(log.timestamp as any),
          });
        } catch {
          // skip malformed log
        }
      }

      const publishedExams = exams
        .filter((e) => e.acceptingResponses !== false)
        .slice(0, 3)
        .map((exam) => {
          const course = courses.find((c) => c.id === exam.courseId);
          return {
            id: exam.id,
            title: exam.title,
            subtitle: course?.title || "Course",
            urgency: "high" as const,
            urgencyLabel: "Open",
            time: "Accepting responses",
          };
        });

      const publishedExamCount = exams.filter((e) => e.acceptingResponses !== false).length;
      const closedExams = exams.filter((e) => e.acceptingResponses === false).length;

      res.json({
        stats: {
          totalStudents: students.length,
          activeCourses: courses.length,
          totalExams: exams.length,
          publishedExams: publishedExamCount,
          closedExams,
          totalEnrollments,
          avgCompletion,
          activityEvents: signalLogs.length,
        },
        coursePerformance,
        activitySeries: { weekly, monthly, yearly },
        weekChangePct,
        thisWeekCount,
        prevWeekCount,
        recentActivities,
        upcomingExams: publishedExams,
      });
    } catch (error) {
      console.error("Failed to build admin dashboard:", error);
      res.status(500).json({ message: "Failed to load dashboard data" });
    }
  });

  // Live admin reports aggregates (tenant-scoped) — real data for Reports page
  app.get("/api/admin/reports", isAdmin, async (req, res) => {
    try {
      const tenantId = Number(req.user!.tenantId);
      if (!Number.isFinite(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant" });
      }

      const rangeRaw = String(req.query.range || "7d");
      const rangeDays = rangeRaw === "30d" ? 30 : rangeRaw === "90d" ? 90 : 7;
      const batchIdParam = req.query.batchId != null ? Number(req.query.batchId) : null;

      const users = await storage.getUsersByTenant(tenantId);
      const courses = await storage.getCoursesByTenant(tenantId);
      const exams = await storage.getExamsByTenant(tenantId);
      const batchesList = await storage.getBatchesByTenant(tenantId);
      const logs = await storage.getActivityLogsByTenant(tenantId);
      const allAttempts = await storage.getAllExamAttemptsForAdmin(tenantId);

      const students = users.filter((u) => u.role === "student");
      const courseById = new Map(courses.map((c) => [c.id, c]));
      const userById = new Map(users.map((u) => [u.id, u]));

      const enrollmentsByCourse = await Promise.all(
        courses.map(async (course) => ({
          course,
          enrollments: await storage.getEnrollmentsByCourse(course.id),
        }))
      );

      const enrollmentByUserCourse = new Map<string, number>();
      const enrollmentsByUser = new Map<number, { courseId: number; progress: number }[]>();
      let totalEnrollments = 0;
      let progressSumAcrossCourses = 0;

      const coursesReport = enrollmentsByCourse.map(({ course, enrollments }) => {
        totalEnrollments += enrollments.length;
        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;
        let progressSum = 0;

        for (const e of enrollments) {
          const progress = Number(e.progress) || 0;
          progressSum += progress;
          enrollmentByUserCourse.set(`${e.userId}:${e.courseId}`, progress);
          const list = enrollmentsByUser.get(e.userId) || [];
          list.push({ courseId: e.courseId, progress });
          enrollmentsByUser.set(e.userId, list);

          if (progress >= 100) completed += 1;
          else if (progress > 0) inProgress += 1;
          else notStarted += 1;
        }

        const avgProgress =
          enrollments.length === 0 ? 0 : Math.round(progressSum / enrollments.length);
        progressSumAcrossCourses += avgProgress;

        return {
          id: course.id,
          title: course.title,
          enrolled: enrollments.length,
          avgProgress,
          completed,
          inProgress,
          notStarted,
        };
      });

      const avgProgress =
        courses.length === 0 ? 0 : Math.round(progressSumAcrossCourses / courses.length);

      // Activity by day (exclude dashboard noise)
      const signalLogs = logs.filter((l) => l.activityType !== "dashboard_view");
      const now = new Date();
      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };
      const activityByDay: { date: string; count: number }[] = [];
      for (let i = rangeDays - 1; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const start = startOfDay(day);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        const count = signalLogs.filter((l) => {
          const t = new Date(l.timestamp as any).getTime();
          return t >= start.getTime() && t < end.getTime();
        }).length;
        activityByDay.push({
          date: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count,
        });
      }

      const rangeStart = startOfDay(new Date(now));
      rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

      const attemptsInRange = allAttempts.filter((a) => {
        const t = new Date(a.startedAt as any).getTime();
        return t >= rangeStart.getTime();
      });

      // Exams comparison
      const attemptsByExam = new Map<number, typeof allAttempts>();
      for (const a of allAttempts) {
        const list = attemptsByExam.get(a.examId) || [];
        list.push(a);
        attemptsByExam.set(a.examId, list);
      }

      const examsReport = exams.map((exam) => {
        const attempts = attemptsByExam.get(exam.id) || [];
        const completed = attempts.filter((a) => a.completedAt).length;
        const reviewed = attempts.filter((a) => a.reviewedAt || (a.feedback && String(a.feedback).trim())).length;
        const course = courseById.get(exam.courseId);
        return {
          id: exam.id,
          title: exam.title,
          courseTitle: course?.title || "Course",
          attempts: attempts.length,
          completed,
          reviewed,
          attemptsInRange: attemptsInRange.filter((a) => a.examId === exam.id).length,
        };
      });

      // Batches
      const batchesReport = await Promise.all(
        batchesList.map(async (batch) => {
          const courseIds = await storage.getBatchCourseIds(batch.id);
          const members = await storage.getBatchEnrollmentsByBatch(batch.id);
          let progressTotal = 0;
          let progressSamples = 0;
          for (const member of members) {
            for (const courseId of courseIds) {
              const key = `${member.userId}:${courseId}`;
              if (enrollmentByUserCourse.has(key)) {
                progressTotal += enrollmentByUserCourse.get(key)!;
                progressSamples += 1;
              }
            }
          }
          return {
            id: batch.id,
            name: batch.name,
            batchCode: batch.batchCode,
            studentCount: members.length,
            courseCount: courseIds.length,
            avgProgress: progressSamples === 0 ? 0 : Math.round(progressTotal / progressSamples),
            isActive: batch.isActive,
            courseIds,
          };
        })
      );

      // Optional batch detail
      let batchDetail: null | {
        id: number;
        name: string;
        students: { id: number; name: string; avgProgress: number }[];
        courses: { id: number; title: string; avgProgress: number }[];
      } = null;

      if (batchIdParam && Number.isFinite(batchIdParam)) {
        const batch = batchesList.find((b) => b.id === batchIdParam);
        if (batch && batch.tenantId === tenantId) {
          const courseIds = await storage.getBatchCourseIds(batch.id);
          const members = await storage.getBatchEnrollmentsByBatch(batch.id);

          const detailStudents = members.map((member) => {
            const user = userById.get(member.userId);
            let sum = 0;
            let n = 0;
            for (const courseId of courseIds) {
              const key = `${member.userId}:${courseId}`;
              if (enrollmentByUserCourse.has(key)) {
                sum += enrollmentByUserCourse.get(key)!;
                n += 1;
              }
            }
            return {
              id: member.userId,
              name: user
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
                : `User #${member.userId}`,
              avgProgress: n === 0 ? 0 : Math.round(sum / n),
            };
          }).sort((a, b) => b.avgProgress - a.avgProgress);

          const detailCourses = courseIds.map((courseId) => {
            const course = courseById.get(courseId);
            let sum = 0;
            let n = 0;
            for (const member of members) {
              const key = `${member.userId}:${courseId}`;
              if (enrollmentByUserCourse.has(key)) {
                sum += enrollmentByUserCourse.get(key)!;
                n += 1;
              }
            }
            return {
              id: courseId,
              title: course?.title || `Course #${courseId}`,
              avgProgress: n === 0 ? 0 : Math.round(sum / n),
            };
          });

          batchDetail = {
            id: batch.id,
            name: batch.name,
            students: detailStudents,
            courses: detailCourses,
          };
        }
      }

      // Student rankings (top by avg course progress)
      const attemptsByUser = new Map<number, number>();
      for (const a of allAttempts) {
        attemptsByUser.set(a.userId, (attemptsByUser.get(a.userId) || 0) + 1);
      }

      const studentsReport = students
        .map((s) => {
          const enrolls = enrollmentsByUser.get(s.id) || [];
          const avg =
            enrolls.length === 0
              ? 0
              : Math.round(
                  enrolls.reduce((sum, e) => sum + e.progress, 0) / enrolls.length
                );
          return {
            id: s.id,
            name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.username,
            coursesEnrolled: enrolls.length,
            avgProgress: avg,
            examAttempts: attemptsByUser.get(s.id) || 0,
          };
        })
        .sort(
          (a, b) =>
            b.avgProgress - a.avgProgress ||
            b.examAttempts - a.examAttempts ||
            b.coursesEnrolled - a.coursesEnrolled
        )
        .slice(0, 15);

      // Completion pie buckets (tenant-wide)
      const completionBuckets = coursesReport.reduce(
        (acc, c) => {
          acc.completed += c.completed;
          acc.inProgress += c.inProgress;
          acc.notStarted += c.notStarted;
          return acc;
        },
        { completed: 0, inProgress: 0, notStarted: 0 }
      );

      res.json({
        summary: {
          students: students.length,
          batches: batchesList.length,
          courses: courses.length,
          enrollments: totalEnrollments,
          avgProgress,
          examAttempts: allAttempts.length,
          examAttemptsInRange: attemptsInRange.length,
          activityEvents: signalLogs.length,
          exams: exams.length,
        },
        activityByDay,
        completionBuckets,
        batches: batchesReport,
        batchDetail,
        courses: coursesReport.sort((a, b) => b.enrolled - a.enrolled || b.avgProgress - a.avgProgress),
        exams: examsReport.sort((a, b) => b.attempts - a.attempts),
        students: studentsReport,
        range: rangeRaw === "30d" || rangeRaw === "90d" ? rangeRaw : "7d",
      });
    } catch (error) {
      console.error("Failed to build admin reports:", error);
      res.status(500).json({ message: "Failed to load reports data" });
    }
  });

  app.post("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertActivityLogSchema.parse({
        ...req.body,
        userId: req.user!.id,
        tenantId: req.user!.tenantId
      });
      
      const log = await storage.createActivityLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity log" });
    }
  });

  // AI Chat API
  app.post("/api/ai/chat", isAuthenticated, chatWithAI);
  
  // Log AI chat interactions
  app.post("/api/ai/log", isAuthenticated, logAIChat);
  
  // AI image analysis endpoint
  app.post("/api/ai/image-analysis", isAuthenticated, analyzeImage);
  
  // Batch management routes
  // Get all batches for tenant
  app.get("/api/batches", isAdmin, async (req, res) => {
    try {
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      const batchesList = await storage.getBatchesByTenant(req.user!.tenantId);
      const withCourses = await Promise.all(
        batchesList.map(async (batch) => {
          const courseIds = await storage.getBatchCourseIds(batch.id);
          const members = await storage.getBatchEnrollmentsByBatch(batch.id);
          return {
            ...batch,
            courseIds,
            studentCount: members.length,
          };
        })
      );
      res.json(withCourses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });
  
  // Get batches by course
  app.get("/api/courses/:courseId/batches", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      const batches = await storage.getBatchesByCourse(courseId);
      res.json(batches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });
  
  // Get single batch
  app.get("/api/batches/:id", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }

      const courseIds = await storage.getBatchCourseIds(batchId);
      res.json({ ...batch, courseIds });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch" });
    }
  });
  
  // Create new batch
  app.post("/api/batches", isAdmin, async (req, res) => {
    try {
      const rawCourseIds: number[] = Array.isArray(req.body.courseIds)
        ? req.body.courseIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
        : req.body.courseId
          ? [Number(req.body.courseId)]
          : [];

      if (rawCourseIds.length === 0) {
        return res.status(400).json({ message: "Select at least one course" });
      }

      // @ts-ignore: req.user! is defined because of isAdmin middleware
      const validatedData = insertBatchSchema.parse({
        ...req.body,
        courseId: rawCourseIds[0],
        courseIds: rawCourseIds,
        endDate: req.body.endDate || null,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.id,
      });

      // Validate all courses belong to tenant
      for (const courseId of rawCourseIds) {
        const course = await storage.getCourse(courseId);
        // @ts-ignore
        if (!course || course.tenantId !== req.user!.tenantId) {
          return res.status(403).json({ message: `Access denied to course ${courseId}` });
        }
      }

      // Check if trainer belongs to user's tenant
      const trainer = await storage.getUser(validatedData.trainerId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!trainer || trainer.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this trainer" });
      }

      if (
        validatedData.endDate &&
        validatedData.startDate &&
        validatedData.endDate < validatedData.startDate
      ) {
        return res.status(400).json({ message: "End date must be on or after start date" });
      }

      const batch = await storage.createBatch(validatedData);
      const courseIds = await storage.getBatchCourseIds(batch.id);
      res.status(201).json({ ...batch, courseIds });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error(error);
      res.status(500).json({ message: "Failed to create batch" });
    }
  });
  
  // Update batch
  app.put("/api/batches/:id", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }

      const rawCourseIds: number[] | undefined = Array.isArray(req.body.courseIds)
        ? req.body.courseIds
            .map((id: any) => Number(id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : undefined;

      if (rawCourseIds) {
        if (rawCourseIds.length === 0) {
          return res.status(400).json({ message: "Select at least one course" });
        }
        for (const courseId of rawCourseIds) {
          const course = await storage.getCourse(courseId);
          // @ts-ignore
          if (!course || course.tenantId !== req.user!.tenantId) {
            return res.status(403).json({ message: `Access denied to course ${courseId}` });
          }
        }
        await storage.setBatchCourses(batchId, rawCourseIds);
        req.body.courseId = rawCourseIds[0];

        // Ensure existing batch members get enrollments for newly linked courses
        const members = await storage.getBatchEnrollmentsByBatch(batchId);
        await Promise.all(
          members.flatMap((member) =>
            rawCourseIds.map((courseId) =>
              storage.createEnrollment({ userId: member.userId, courseId })
            )
          )
        );
      }

      const { courseIds: _ignored, ...batchFields } = req.body;
      const updatedBatch = await storage.updateBatch(batchId, batchFields);
      const courseIds = await storage.getBatchCourseIds(batchId);
      res.json({ ...updatedBatch, courseIds });
    } catch (error) {
      res.status(500).json({ message: "Failed to update batch" });
    }
  });
  
  // Delete batch
  app.delete("/api/batches/:id", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }
      
      await storage.deleteBatch(batchId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete batch" });
    }
  });
  
  // Get batch enrollments by batch
  app.get("/api/batches/:batchId/enrollments", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.batchId);
      const batch = await storage.getBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }
      
      const enrollments = await storage.getBatchEnrollmentsByBatch(batchId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch batch enrollments" });
    }
  });
  
  // Get batch enrollments by user with batch data
  app.get("/api/batch-enrollments/user/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check if user belongs to the admin's tenant
      const user = await storage.getUser(userId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this user" });
      }
      
      const enrollments = await storage.getBatchEnrollmentsByUser(userId);
      
      // Enhance enrollments with batch data
      const enhancedEnrollments = [];
      for (const enrollment of enrollments) {
        const batch = await storage.getBatch(enrollment.batchId);
        enhancedEnrollments.push({
          ...enrollment,
          batch: batch
        });
      }
      
      res.json(enhancedEnrollments);
    } catch (error) {
      console.error("Failed to fetch batch enrollments:", error);
      res.status(500).json({ message: "Failed to fetch batch enrollments for user" });
    }
  });
  
  // Create batch enrollment (single student)
  app.post("/api/batch-enrollments", isAdmin, async (req, res) => {
    try {
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      const validatedData = insertBatchEnrollmentSchema.parse({
        ...req.body,
        enrolledBy: req.user!.id
      });
      
      // Check if batch belongs to user's tenant
      const batch = await storage.getBatch(validatedData.batchId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!batch || batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }
      
      // Check if user belongs to tenant
      const user = await storage.getUser(validatedData.userId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this user" });
      }
      
      const enrollment = await storage.createBatchEnrollment(validatedData);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create batch enrollment" });
    }
  });
  
  // Create batch enrollments in bulk (multiple students)
  app.post("/api/batch-enrollments/bulk", isAdmin, async (req, res) => {
    try {
      const { batchId, userIds } = req.body;
      
      if (!batchId || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const uniqueUserIds = Array.from(
        new Set(userIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id)))
      );
      
      // Check if batch belongs to user's tenant
      const batch = await storage.getBatch(batchId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!batch || batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }

      // Validate students belong to tenant
      for (const userId of uniqueUserIds) {
        const user = await storage.getUser(userId);
        // @ts-ignore
        if (!user || user.tenantId !== req.user!.tenantId || user.role !== "student") {
          return res.status(403).json({ message: `Access denied to user ${userId}` });
        }
      }
      
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      const enrollments = uniqueUserIds.map((userId) => ({
        batchId,
        userId,
        enrolledBy: req.user!.id,
        status: "active",
      }));
      
      const createdEnrollments = await storage.createBatchEnrollmentsBulk(enrollments);
      res.status(201).json(createdEnrollments);
    } catch (error) {
      console.error("Failed to create batch enrollments:", error);
      res.status(500).json({ message: "Failed to create batch enrollments" });
    }
  });
  
  // Delete batch enrollment
  app.delete("/api/batch-enrollments/:id", isAdmin, async (req, res) => {
    try {
      const enrollmentId = parseInt(req.params.id);
      const enrollment = await storage.getBatchEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      // Check if the batch belongs to user's tenant
      const batch = await storage.getBatch(enrollment.batchId);
      // @ts-ignore: req.user! is defined because of isAdmin middleware
      if (!batch || batch.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this enrollment" });
      }
      
      await storage.deleteBatchEnrollment(enrollmentId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete batch enrollment" });
    }
  });
  
  // Lesson Progress Routes
  // Check if a lesson is completed by user
  app.get("/api/lesson-progress/:lessonId", isAuthenticated, async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const userId = req.user!.id;
      
      // Check if lesson exists and belongs to user's tenant
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Get the module to check tenant access
      const module = await storage.getModule(lesson.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Check course tenant
      const course = await storage.getCourse(module.courseId);
      if (!course || course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this lesson" });
      }
      
      // Get progress
      const progress = await storage.getLessonProgress(userId, lessonId);
      
      res.json({
        lessonId,
        userId,
        completed: progress ? true : false,
        completedAt: progress ? progress.completedAt : null
      });
    } catch (error) {
      console.error("Failed to fetch lesson progress:", error);
      res.status(500).json({ message: "Failed to fetch lesson progress" });
    }
  });
  
  // Mark a lesson as completed
  app.post("/api/lesson-progress", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLessonProgressSchema.parse({
        userId: req.user!.id,
        lessonId: req.body.lessonId,
        moduleId: req.body.moduleId,
        courseId: req.body.courseId,
        completed: true
      });
      
      // Check if lesson exists and belongs to user's tenant
      const lesson = await storage.getLesson(validatedData.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Verify that moduleId matches the lesson's moduleId
      if (lesson.moduleId !== validatedData.moduleId) {
        return res.status(400).json({ message: "Invalid module ID for this lesson" });
      }
      
      // Get the module to check course ID
      const module = await storage.getModule(lesson.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      // Verify that courseId matches the module's courseId
      if (module.courseId !== validatedData.courseId) {
        return res.status(400).json({ message: "Invalid course ID for this module" });
      }
      
      // Check if the user is enrolled in the course
      const enrollments = await storage.getEnrollmentsByUser(req.user!.id);
      const isEnrolled = enrollments.some(e => e.courseId === validatedData.courseId);
      
      if (!isEnrolled) {
        return res.status(403).json({ message: "You must be enrolled in this course to mark lessons as complete" });
      }
      
      // Check if progress already exists
      const existingProgress = await storage.getLessonProgress(req.user!.id, validatedData.lessonId);
      
      if (existingProgress) {
        return res.json(existingProgress); // Progress already recorded
      }
      
      // Create new progress
      const progress = await storage.createLessonProgress(validatedData);
      
      // Log activity — store lessonId so dashboards can show the lesson name
      await storage.createActivityLog({
        userId: req.user!.id,
        activityType: "lesson_complete",
        resourceId: validatedData.lessonId,
        resourceType: "lesson",
        tenantId: req.user!.tenantId
      });
      
      res.status(201).json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Failed to create lesson progress:", error);
      res.status(500).json({ message: "Failed to create lesson progress" });
    }
  });
  
  // Get all progress for a course (for a specific user)
  app.get("/api/course-progress/:courseId", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const userId = req.user!.id;
      
      // Check if course exists and belongs to user's tenant
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      // Check if user is enrolled in the course
      const enrollments = await storage.getEnrollmentsByUser(userId);
      const enrollment = enrollments.find(e => e.courseId === courseId);
      
      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this course to view progress" });
      }
      
      // Get completed lessons for this course
      const completedLessons = await storage.getLessonProgressByCourse(userId, courseId);
      
      // Get all modules and lessons in the course
      const modules = await storage.getModulesByCourse(courseId);
      const modulesWithLessons = [];
      
      for (const module of modules) {
        const lessons = await storage.getLessonsByModule(module.id);
        const lessonsWithProgress = lessons.map(lesson => {
          const isCompleted = completedLessons.some(p => p.lessonId === lesson.id);
          return {
            ...lesson,
            completed: isCompleted
          };
        });
        
        modulesWithLessons.push({
          ...module,
          lessons: lessonsWithProgress
        });
      }
      
      res.json({
        courseId,
        progress: enrollment.progress,
        completedAt: enrollment.completedAt,
        modules: modulesWithLessons,
        completedLessonCount: completedLessons.length
      });
    } catch (error) {
      console.error("Failed to fetch course progress:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });
  
  // Admin endpoint: Get progress for all students in a course
  app.get("/api/admin/course-progress/:courseId", isAdmin, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      
      // Check if course exists and belongs to admin's tenant
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: "Access denied to this course" });
      }
      
      // Get all enrollments for this course
      const enrollments = await storage.getEnrollmentsByCourse(courseId);
      
      // Get progress data for each enrollment
      const progressData = [];
      
      for (const enrollment of enrollments) {
        const user = await storage.getUser(enrollment.userId);
        if (!user) continue;
        
        const { password, ...safeUser } = user;
        const completedLessons = await storage.getLessonProgressByCourse(enrollment.userId, courseId);
        
        progressData.push({
          user: safeUser,
          enrollment,
          completedLessonCount: completedLessons.length
        });
      }
      
      res.json({
        courseId,
        totalEnrollments: enrollments.length,
        studentProgress: progressData
      });
    } catch (error) {
      console.error("Failed to fetch course progress for admin:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });
  
  // Image upload endpoint
  app.post("/api/ai/upload-image", isAuthenticated, handleImageUpload, uploadImage);
  
  // Image generation endpoint
  app.post("/api/ai/generate-image", isAuthenticated, generateImage);

  // Course thumbnail upload endpoint
  const courseThumbnailDir = path.join(process.cwd(), 'uploads', 'courses');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(courseThumbnailDir)) {
    fs.mkdirSync(courseThumbnailDir, { recursive: true });
  }
  
  // Configure multer for course thumbnail uploads
  const courseThumbnailStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, courseThumbnailDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `course-thumbnail-${uniqueSuffix}${ext}`);
    }
  });
  
  // File filter for course thumbnails
  const courseThumbnailFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only jpg, jpeg, png, gif, webp files
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/png' || file.mimetype === 'image/gif' || 
        file.mimetype === 'image/webp') {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  };
  
  const uploadCourseThumbnail = multer({ 
    storage: courseThumbnailStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: courseThumbnailFilter
  });
  
  // Course thumbnail upload endpoint
  app.post("/api/upload", isAuthenticated, uploadCourseThumbnail.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the relative path from uploads directory
      const thumbnailPath = `courses/${req.file.filename}`;
      
      res.json({ url: thumbnailPath });
    } catch (error) {
      console.error("Course thumbnail upload error:", error);
      res.status(500).json({ message: "Failed to upload course thumbnail" });
    }
  });

  // Admin grading endpoints
  app.get("/api/admin/exam-attempts", isAdmin, async (req, res) => {
    try {
      const attempts = await storage.getAllExamAttemptsForAdmin(req.user!.tenantId);
      res.json(attempts);
    } catch (error) {
      console.error("Failed to fetch exam attempts for admin:", error);
      res.status(500).json({ message: "Failed to fetch exam attempts" });
    }
  });

  app.put("/api/admin/exam-attempts/:id/grade", isAdmin, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const { feedback } = req.body;

      const attempt = await storage.gradeExamAttempt(attemptId, feedback, req.user!.tenantId);
      res.json(attempt);
    } catch (error) {
      console.error("Failed to grade exam attempt:", error);
      res.status(500).json({ message: "Failed to save grading" });
    }
  });

  // Student results endpoint
  app.get("/api/student/exam-results", isAuthenticated, async (req, res) => {
    try {
      const results = await storage.getStudentExamResults(req.user!.id);
      res.json(results);
    } catch (error) {
      console.error("Failed to fetch student exam results:", error);
      res.status(500).json({ message: "Failed to fetch exam results" });
    }
  });

  // ─── Token-Based Theme API ─────────────────────────────────────────────────

  // GET /api/theme — returns the active tenant theme token overrides (all roles)
  app.get("/api/theme", isAuthenticated, async (req, res) => {
    try {
      const themeConfig = await storage.getTenantTheme(req.user!.tenantId);
      res.json({ themeConfig });
    } catch (error) {
      console.error("Failed to fetch tenant theme:", error);
      res.status(500).json({ message: "Failed to fetch theme" });
    }
  });

  // PUT /api/theme — save/update tenant theme token overrides (admin only)
  app.put("/api/theme", isAdmin, async (req, res) => {
    try {
      const { tokenOverrides } = req.body;
      if (!tokenOverrides || typeof tokenOverrides !== "object") {
        return res.status(400).json({ message: "tokenOverrides object is required" });
      }
      const updated = await storage.updateTenantTheme(req.user!.tenantId, tokenOverrides);
      res.json({ tenant: updated, message: "Theme saved successfully" });
    } catch (error) {
      console.error("Failed to update tenant theme:", error);
      res.status(500).json({ message: "Failed to save theme" });
    }
  });

  // DELETE /api/theme — reset tenant theme to default (admin only)
  app.delete("/api/theme", isAdmin, async (req, res) => {
    try {
      await storage.resetTenantTheme(req.user!.tenantId);
      res.json({ message: "Theme reset to default" });
    } catch (error) {
      console.error("Failed to reset tenant theme:", error);
      res.status(500).json({ message: "Failed to reset theme" });
    }
  });

  // GET /api/theme/templates — list all theme templates for this tenant (admin only)
  app.get("/api/theme/templates", isAdmin, async (req, res) => {
    try {
      const templates = await storage.getThemeTemplates(req.user!.tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch theme templates:", error);
      res.status(500).json({ message: "Failed to fetch theme templates" });
    }
  });

  // POST /api/theme/templates — save a named custom theme (admin only)
  app.post("/api/theme/templates", isAdmin, async (req, res) => {
    try {
      const { name, tag, tokenOverrides } = req.body;
      if (!name || !tokenOverrides || typeof tokenOverrides !== "object") {
        return res.status(400).json({ message: "name and tokenOverrides are required" });
      }
      const template = await storage.createThemeTemplate({
        name,
        tag: tag ?? null,
        tokenOverrides,
        isPreset: false,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.id,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Failed to create theme template:", error);
      res.status(500).json({ message: "Failed to save theme template" });
    }
  });

  // DELETE /api/theme/templates/:id — delete a custom theme (admin only, tenant-owned only)
  app.delete("/api/theme/templates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid template ID" });
      const deleted = await storage.deleteThemeTemplate(id, req.user!.tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found or not deletable" });
      }
      res.json({ message: "Theme template deleted" });
    } catch (error) {
      console.error("Failed to delete theme template:", error);
      res.status(500).json({ message: "Failed to delete theme template" });
    }
  });

  // ─── End Theme API ─────────────────────────────────────────────────────────

  // Initialize the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
