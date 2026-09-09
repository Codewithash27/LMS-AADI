import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Define a more flexible type for profile photo that can handle File objects
type ProfilePhotoType = File | string | null | undefined;

// Define registration data type including file uploads
type RegistrationData = Omit<InsertUser, 'profilePhoto'> & { 
  profilePhoto?: ProfilePhotoType;
  confirmPassword?: string; 
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegistrationData>;
  updateProfileMutation: UseMutationResult<SelectUser, Error, Partial<SelectUser> & { password?: string }>;
  updateProfilePhotoMutation: UseMutationResult<SelectUser, Error, File>;
  isLoggingOut: boolean;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Drop previous user's cached data (admin catalog must not leak to student)
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      
      // Redirect based on user role
      if (user.role === "admin" || user.role === "superadmin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegistrationData) => {
      // Check if we need to handle file upload
      const hasFileUpload = userData.profilePhoto && 
                         typeof userData.profilePhoto !== 'string' && 
                         userData.profilePhoto !== null;
                         
      if (hasFileUpload) {
        // Create FormData for multipart/form-data submission (for file uploads)
        const formData = new FormData();
        
        // Add all form fields to formData
        Object.entries(userData).forEach(([key, value]) => {
          if (key === 'profilePhoto' && value && typeof value !== 'string') {
            // Make sure we're only adding valid File objects
            if (value instanceof File) {
              formData.append(key, value);
            }
          } else if (key !== 'confirmPassword' && value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        
        // Use fetch directly for FormData
        const res = await fetch('/api/register', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Registration failed');
        }
        
        return await res.json();
      } else {
        // Create a clean version of userData without File objects
        const { confirmPassword, profilePhoto, ...cleanUserData } = userData;
        
        // Standard JSON request if no file
        const res = await apiRequest("POST", "/api/register", cleanUserData);
        return await res.json();
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      
      // Redirect based on user role
      if (user.role === "admin" || user.role === "superadmin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }

      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<SelectUser> & { password?: string }) => {
      if (!user) throw new Error("You must be logged in to update your profile");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, userData);
      return await res.json();
    },
    onSuccess: (updatedUser: SelectUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("You must be logged in to update your profile photo");
      const formData = new FormData();
      formData.append("profilePhoto", file);
      const res = await fetch(`/api/users/${user.id}/profile-photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update profile photo");
      }
      return await res.json();
    },
    onSuccess: (updatedUser: SelectUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Photo update failed",
        description: error.message || "Failed to update profile photo.",
        variant: "destructive",
      });
    },
  });

  const isLoggingOut = logoutMutation.isPending;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        updateProfilePhotoMutation,
        isLoggingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
