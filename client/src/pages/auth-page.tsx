import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterWizard } from "@/components/auth/RegisterWizard";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Password validation regex (at least 8 chars, one uppercase, one lowercase, one number, one special char)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Registration form schema
const registerSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  gender: z.string().optional(),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  profilePhoto: z.instanceof(File).optional(),
  
  // Academic Details
  educationLevel: z.string({
    required_error: "Education level is required",
  }),
  schoolCollege: z.string().min(1, "School/College name is required"),
  yearOfStudy: z.string({
    required_error: "Year of study is required",
  }),
  
  // Login Credentials
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().refine(
    (val) => passwordRegex.test(val),
    "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
  ),
  confirmPassword: z.string(),
  tenantId: z.number().min(1, "Tenant ID is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin" || user.role === "superadmin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      gender: "Prefer not to say",
      dateOfBirth: undefined,
      educationLevel: "",
      schoolCollege: "",
      yearOfStudy: "",
      tenantId: 1, // Default to first tenant
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert("Only JPG, JPEG and PNG files are allowed");
        return;
      }
      
      // Validate file size (2MB = 2 * 1024 * 1024 bytes)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should not exceed 2MB");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Format date of birth as YYYY-MM-DD string
    let dateOfBirthStr = '';
    if (data.dateOfBirth instanceof Date) {
      dateOfBirthStr = data.dateOfBirth.toISOString().split('T')[0];
    }
    
    // Extract values we need from the form data (remove confirmPassword as it's not in our schema)
    const { confirmPassword, profilePhoto, ...validFormData } = data;
    
    // Prepare the registration data for submission
    const registrationData = {
      ...validFormData,
      dateOfBirth: dateOfBirthStr,
      profilePhoto: selectedFile, // Pass the actual File object if exists
      confirmPassword: confirmPassword, // Include for validation
      role: "student" // Default role for new registrations
    };
    
    // Call the registration mutation with the data including the file if selected
    registerMutation.mutate(registrationData as any);
  };

  return (
    <AuthLayout
      mode={activeTab === "register" ? "register" : "login"}
      tabs={<AuthTabs value={activeTab} onChange={setActiveTab} />}
    >
      {activeTab === "login" ? (
        <LoginForm
          form={loginForm}
          showPassword={showLoginPassword}
          onShowPassword={setShowLoginPassword}
          pending={loginMutation.isPending}
          onSubmit={onLoginSubmit}
          onCreate={() => setActiveTab("register")}
        />
      ) : (
        <RegisterWizard
          form={registerForm}
          step={registerStep}
          setStep={setRegisterStep}
          showPassword={showRegisterPassword}
          onShowPassword={setShowRegisterPassword}
          showConfirm={showConfirmPassword}
          onShowConfirm={setShowConfirmPassword}
          file={selectedFile}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          pending={registerMutation.isPending}
          onSubmit={onRegisterSubmit}
          onSignIn={() => setActiveTab("login")}
        />
      )}
    </AuthLayout>
  );
}
