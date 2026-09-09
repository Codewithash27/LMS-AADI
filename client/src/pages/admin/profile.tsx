import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  User, 
  KeyRound, 
  Mail, 
  Building, 
  AtSign, 
  Loader2, 
  Edit2, 
  Shield,
  CheckCircle2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

// Profile update schema
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  // Password is optional - only validate if provided (not empty)
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AdminProfile() {
  const { user, updateProfileMutation } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
    },
  });
  
  // Sync form values when user data changes
  useEffect(() => {
    if (user && !isEditing) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: "",
      });
    }
  }, [user, isEditing, form]);
  
  const onSubmit = (data: ProfileFormValues) => {
    // Only include password if it's not empty
    const updateData = {...data};
    if (!updateData.password || updateData.password.trim() === "") {
      delete updateData.password;
    }
    
    updateProfileMutation.mutate(updateData, {
      onSuccess: (updatedUser) => {
        setIsEditing(false);
        // Reset form with updated values directly from the response
        form.reset({
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          email: updatedUser.email || "",
          password: "",
        });
        
        // Force a re-query of the user data to update all UI components
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "✅ Profile updated successfully",
          description: "Your profile information has been saved.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "❌ Failed to update profile",
          description: error?.message || "An error occurred while updating your profile.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to current user values
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
    });
  };
  
  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and personal information</p>
        </div>
        
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage
                      src={getProfilePhotoSrc(user.profilePhoto) || undefined}
                      alt={`${user.firstName} ${user.lastName}`}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {user.firstName} {user.lastName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {user.role}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <AtSign className="h-3 w-3" />
                          {user.username}
                        </span>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tenant ID</p>
                        <p className="font-medium font-mono">{user.tenantId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Status</p>
                        <p className="font-medium text-green-600">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="personal" className="gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security & Password
              </TabsTrigger>
            </TabsList>
            
            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">
                          First Name
                        </Label>
                        <Input 
                          id="firstName" 
                          {...form.register("firstName")}
                          disabled={!isEditing}
                          className="h-11"
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            {form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">
                          Last Name
                        </Label>
                        <Input 
                          id="lastName" 
                          {...form.register("lastName")}
                          disabled={!isEditing}
                          className="h-11"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        {...form.register("email")}
                        disabled={!isEditing}
                        className="h-11"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        This email will be used for account notifications and login
                      </p>
                    </div>
                    
                    {isEditing && (
                      <div className="pt-4 border-t flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          className="gap-2"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security & Password Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        New Password
                      </Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder={isEditing ? "Enter new password (min. 6 characters)" : "••••••••"}
                        {...form.register("password")}
                        disabled={!isEditing}
                        className="h-11"
                      />
                      {form.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank if you don't want to change your password
                      </p>
                    </div>
                    
                    {isEditing && (
                      <div className="pt-4 border-t flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          className="gap-2"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              Update Password
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {!isEditing && (
                      <div className="pt-4 border-t">
                        <Button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="gap-2"
                        >
                          <KeyRound className="h-4 w-4" />
                          Change Password
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
              
              {/* Security Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Information
                  </CardTitle>
                  <CardDescription>
                    Additional security details about your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                      <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Tenant ID</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{user.tenantId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Account Status</p>
                        <p className="text-xs text-green-600 font-medium mt-1">Verified & Active</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}