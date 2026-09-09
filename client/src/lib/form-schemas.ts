import { z } from "zod";

/** Same rule as public registration on the auth page. */
export const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const strongPasswordSchema = z
  .string()
  .refine(
    (val) => strongPasswordRegex.test(val),
    "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
  );

export const emailSchema = z.string().email("Invalid email address");

export const createStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: emailSchema,
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  gender: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  educationLevel: z.string().min(1, "Education level is required"),
  schoolCollege: z.string().min(1, "School/College name is required"),
  yearOfStudy: z.string().min(1, "Year of study is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: strongPasswordSchema,
});

export type CreateStudentFormValues = z.infer<typeof createStudentSchema>;

export const examFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(1, "Description is required"),
  courseId: z.string().min(1, "Please select a course"),
  batchId: z.string().optional().default("none"),
  duration: z.coerce
    .number({ invalid_type_error: "Duration is required" })
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration cannot exceed 600 minutes"),
  acceptingResponses: z.boolean().default(true),
  questionSource: z.enum(["manual", "pdf"]).default("manual"),
  questionCount: z.coerce.number().int().min(1).optional(),
});

export type ExamFormValues = z.infer<typeof examFormSchema>;

export const courseMetadataSchema = z.object({
  title: z.string().min(1, "Please enter a course title"),
  description: z.string().optional(),
  category: z.string().min(1, "Please select a category"),
  difficulty: z.string().min(1, "Please select a difficulty"),
  duration: z.coerce.number().min(1).default(12),
  instructorId: z.number().nullable().optional(),
  isEnrollmentRequired: z.boolean().default(true),
});

export type CourseMetadataFormValues = z.infer<typeof courseMetadataSchema>;

export const batchFormSchema = z
  .object({
    name: z.string().min(3, { message: "Batch name must be at least 3 characters" }),
    batchCode: z.string().min(2, { message: "Batch code must be at least 2 characters" }),
    courseIds: z
      .array(z.number().int().positive())
      .min(1, { message: "Select at least one course" }),
    trainerId: z.coerce.number({ required_error: "Please select a trainer" }),
    startDate: z.date({ required_error: "Please select a start date" }),
    endDate: z.date({ required_error: "Please select an end date" }),
    batchTime: z.string().min(1, { message: "Please enter batch time" }),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type BatchFormValues = z.infer<typeof batchFormSchema>;
