import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Set up storage for profile photos
const profilePhotoDir = path.join(process.cwd(), 'uploads', 'profiles');

// Create directory if it doesn't exist
if (!fs.existsSync(profilePhotoDir)){
  fs.mkdirSync(profilePhotoDir, { recursive: true });
}

// Configure multer for profile photo uploads
const profilePhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profilePhotoDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// Set up file filter to restrict file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only jpg, jpeg, png files
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage: profilePhotoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
  fileFilter
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if this is a hashed password (contains a period)
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Temporary plain-text comparison for development
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "lms-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Register endpoint with profile photo upload
  app.post("/api/register", upload.single('profilePhoto'), async (req, res, next) => {
    try {
      const { 
        username, 
        password, 
        firstName, 
        lastName, 
        email, 
        role, 
        tenantId,
        mobileNumber,
        gender,
        dateOfBirth,
        educationLevel,
        schoolCollege,
        yearOfStudy
      } = req.body;
      
      // Check for required fields
      if (!username || !password || !firstName || !lastName || !email || 
          !mobileNumber || !dateOfBirth || !educationLevel || !schoolCollege || !yearOfStudy) {
        return res.status(400).send("Missing required fields");
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Check if this is the first user in the system
      const userCount = await storage.getUserCount();
      
      // If this is the first user, make them an admin
      let userRole = "student";
      if (userCount === 0) {
        userRole = "admin";
      } else if (role) {
        userRole = role;
      }
      
      // Validate if tenant exists
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(400).send("Invalid tenant ID");
      }

      // Get profile photo path if uploaded
      let profilePhotoPath = null;
      if (req.file) {
        // Store relative path from uploads directory
        profilePhotoPath = `profiles/${req.file.filename}`;
      }

      // Store the actual plain password before hashing
      const plainPassword = password;
      
      const user = await storage.createUser({
        username,
        password: await hashPassword(password), // Store hashed password for login
        plainPassword: plainPassword, // Store actual plain text password for admin view
        firstName,
        lastName,
        email,
        mobileNumber,
        gender,
        dateOfBirth,
        profilePhoto: profilePhotoPath,
        educationLevel,
        schoolCollege,
        yearOfStudy,
        role: userRole,
        tenantId: parseInt(tenantId as string, 10)
      });

      // Don't send password to client
      const { password: _, plainPassword: __, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Don't send password to client
    const { password, plainPassword, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't send password to client
    const { password, plainPassword, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Update profile photo (self or admin)
  app.post("/api/users/:id/profile-photo", upload.single("profilePhoto"), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const actor = req.user as SelectUser;
      if (
        userId !== actor.id &&
        actor.role !== "admin" &&
        actor.role !== "superadmin"
      ) {
        return res.status(403).json({ message: "You can only update your own profile photo" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded. Use JPG or PNG under 2MB." });
      }

      const profilePhotoPath = `profiles/${req.file.filename}`;
      const updatedUser = await storage.updateUser(userId, {
        profilePhoto: profilePhotoPath,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, plainPassword: __, ...safeUser } = updatedUser;

      // Keep session user in sync when updating own photo
      if (userId === actor.id) {
        req.login(updatedUser, (err) => {
          if (err) {
            return res.status(500).json({ message: "Photo saved but session refresh failed" });
          }
          return res.json(safeUser);
        });
        return;
      }

      res.json(safeUser);
    } catch (error) {
      console.error("Failed to update profile photo:", error);
      res.status(500).json({ message: "Failed to update profile photo" });
    }
  });
  
  // Serve profile photos
  app.get("/uploads/:folder/:filename", (req, res) => {
    const folder = req.params.folder;
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', folder, filename);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // Add endpoint to update plain passwords for existing users
  app.post("/api/admin/update-plain-passwords", async (req, res) => {
    try {
      // This is a temporary endpoint to fix existing users
      // You should remove this after running it once
      const users = await storage.getUsersByTenant(1); // Adjust tenant ID as needed
      
      let updatedCount = 0;
      for (const user of users) {
        // If user has a hashed password but no plain password, we need to set a default
        // In a real scenario, you'd need to know the original passwords
        if (user.password && user.password.includes('.') && !user.plainPassword) {
          await storage.updateUser(user.id, {
            plainPassword: "contact_admin_for_password" // Placeholder
          });
          updatedCount++;
        }
      }
      
      res.json({ 
        message: `Updated ${updatedCount} users with placeholder plain passwords`,
        updatedCount
      });
    } catch (error) {
      console.error("Failed to update plain passwords:", error);
      res.status(500).json({ message: "Failed to update plain passwords" });
    }
  });
}