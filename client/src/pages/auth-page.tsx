import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, FileText, BarChart3, Building2, Sparkles, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

type RegisterFormValues = z.infer<typeof registerSchema>;

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#EEF3F5] via-white to-[#E4EBEE] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200/25 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-12 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-md bg-white/80 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <div className="bg-gradient-to-br from-primary to-cyan-800 p-4 rounded-xl shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </motion.div>
              <CardTitle className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-cyan-800 bg-clip-text text-transparent">
                Edu Transform Platform
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to your account or create a new one to access courses and exams
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
                  <TabsTrigger 
                    value="login"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>
              
              <TabsContent value="login">
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)} 
                  className="space-y-5"
                >
                  <div className="bg-gradient-to-r from-primary/10 to-teal-100/50 p-4 rounded-lg mb-4 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">👋 Welcome to Edu Transform</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Students and administrators use the same login form.
                          Your role-based permissions will determine what you can access.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-sm font-medium">Username</Label>
                    <Input 
                      id="login-username" 
                      type="text" 
                      placeholder="Enter your username"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {loginForm.formState.errors.username.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input 
                        id="login-password" 
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-11 pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowLoginPassword(true);
                        }}
                        onMouseUp={() => setShowLoginPassword(false)}
                        onMouseLeave={() => setShowLoginPassword(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {loginForm.formState.errors.password.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-primary to-cyan-800 hover:from-primary/90 hover:to-cyan-800/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </motion.form>
              </TabsContent>
              
              <TabsContent value="register">
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)} 
                  className="space-y-5 max-h-[70vh] overflow-y-auto pr-2"
                >
                  <h3 className="text-lg font-semibold border-b border-primary/20 pb-2 text-primary">1. Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-first-name" className="text-sm font-medium">First Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="register-first-name" 
                      type="text" 
                      placeholder="Enter your first name"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...registerForm.register("firstName")}
                    />
                    {registerForm.formState.errors.firstName && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.firstName.message}
                      </motion.p>
                    )}
                  </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-last-name" className="text-sm font-medium">Last Name <span className="text-red-500">*</span></Label>
                      <Input 
                        id="register-last-name" 
                        type="text" 
                        placeholder="Enter your last name"
                        className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm"
                        >
                          {registerForm.formState.errors.lastName.message}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">Email Address <span className="text-red-500">*</span></Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="Enter your email address"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.email.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-mobile" className="text-sm font-medium">Mobile Number <span className="text-red-500">*</span></Label>
                    <Input 
                      id="register-mobile" 
                      type="tel" 
                      placeholder="Enter your mobile number"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...registerForm.register("mobileNumber")}
                    />
                    {registerForm.formState.errors.mobileNumber && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.mobileNumber.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-gender" className="text-sm font-medium">Gender</Label>
                    <Controller
                      name="gender"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select your gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-dob" className="text-sm font-medium">Date of Birth <span className="text-red-500">*</span></Label>
                    <Controller
                      name="dateOfBirth"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Input
                          type="date"
                          id="register-dob"
                          max={new Date().toISOString().split('T')[0]}
                          min="1900-01-01"
                          className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            field.onChange(e.target.value ? new Date(e.target.value) : undefined);
                          }}
                        />
                      )}
                    />
                    {registerForm.formState.errors.dateOfBirth && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.dateOfBirth.message as string}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-profile-photo" className="text-sm font-medium">Profile Photo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="register-profile-photo"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        className="h-11 border-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select Photo
                      </Button>
                      {selectedFile && <span className="text-sm text-muted-foreground">{selectedFile.name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">Optional. Maximum size: 2MB. Formats: JPG, JPEG, PNG</p>
                  </div>
                  
                  <h3 className="text-lg font-semibold mt-6 border-b border-primary/20 pb-2 text-primary">2. Academic Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-education" className="text-sm font-medium">Education Level <span className="text-red-500">*</span></Label>
                    <Controller
                      name="educationLevel"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select your education level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                            <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {registerForm.formState.errors.educationLevel && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.educationLevel.message as string}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-school" className="text-sm font-medium">School/College Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="register-school" 
                      type="text" 
                      placeholder="Enter your school or college name"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...registerForm.register("schoolCollege")}
                    />
                    {registerForm.formState.errors.schoolCollege && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.schoolCollege.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-year" className="text-sm font-medium">Year of Study <span className="text-red-500">*</span></Label>
                    <Controller
                      name="yearOfStudy"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="h-11 focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select your year of study" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Year">1st Year</SelectItem>
                            <SelectItem value="2nd Year">2nd Year</SelectItem>
                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                            <SelectItem value="4th Year">4th Year</SelectItem>
                            <SelectItem value="Final Year">Final Year</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {registerForm.formState.errors.yearOfStudy && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.yearOfStudy.message as string}
                      </motion.p>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold mt-6 border-b border-primary/20 pb-2 text-primary">3. Login Credentials</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-sm font-medium">Username <span className="text-red-500">*</span></Label>
                    <Input 
                      id="register-username" 
                      type="text" 
                      placeholder="Choose a username"
                      className="h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.username.message}
                      </motion.p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium">Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input 
                        id="register-password" 
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Choose a password"
                        className="h-11 pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowRegisterPassword(true);
                        }}
                        onMouseUp={() => setShowRegisterPassword(false)}
                        onMouseLeave={() => setShowRegisterPassword(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.password.message}
                      </motion.p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long and include uppercase, lowercase, 
                      number, and special character.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium">Confirm Password <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input 
                        id="register-confirm-password" 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="h-11 pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                        {...registerForm.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowConfirmPassword(true);
                        }}
                        onMouseUp={() => setShowConfirmPassword(false)}
                        onMouseLeave={() => setShowConfirmPassword(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm"
                      >
                        {registerForm.formState.errors.confirmPassword.message}
                      </motion.p>
                    )}
                  </div>
                  
                  {/* Hidden tenant ID field - using default tenant */}
                  <input 
                    type="hidden" 
                    {...registerForm.register("tenantId", { valueAsNumber: true })}
                    value={1}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-6 h-11 bg-gradient-to-r from-primary to-cyan-800 hover:from-primary/90 hover:to-cyan-800/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Creating Account...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </motion.form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
      </div>
      
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary via-brand-blue to-primary text-white p-6 md:p-8 lg:p-12 flex items-center justify-center relative z-10 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-lg text-center relative z-10"
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-heading font-bold mb-6"
          >
            Welcome to Edu Transform
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl mb-8 text-white/90"
          >
            The complete Learning Management System for educational institutions and organizations.
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg"
            >
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Courses</h3>
              <p className="text-sm text-white/80 leading-relaxed">Create and organize courses with lessons in various formats.</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg"
            >
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Exams</h3>
              <p className="text-sm text-white/80 leading-relaxed">Configure MCQ exams with timing, attempts and question banks.</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg"
            >
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-white/80 leading-relaxed">Monitor student performance with detailed analytics.</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-lg"
            >
              <div className="bg-white/20 p-3 rounded-lg w-fit mb-3">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-tenant</h3>
              <p className="text-sm text-white/80 leading-relaxed">Isolated environments for each organization or institution.</p>
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-10 text-sm text-white/75"
          >
            Designed &amp; Deployed by{" "}
            <span className="font-semibold text-white">Aman Hukkerikar</span>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
