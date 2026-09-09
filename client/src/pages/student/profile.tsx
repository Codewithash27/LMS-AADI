import { useState, useEffect, useRef } from "react";
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
import Header from "@/components/layout/header";
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Loader2,
  Edit2,
  AtSign,
  Shield,
  Camera,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { getProfilePhotoSrc } from "@/lib/profile-photo";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function StudentProfile() {
  const { user, updateProfileMutation, updateProfilePhotoMutation } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments/user"],
  });

  const { data: examAttempts = [] } = useQuery<any[]>({
    queryKey: ["/api/exam-attempts/user"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
    },
  });

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
    const updateData = { ...data };
    if (!updateData.password || updateData.password.trim() === "") {
      delete updateData.password;
    }

    updateProfileMutation.mutate(updateData, {
      onSuccess: (updatedUser) => {
        setIsEditing(false);
        form.reset({
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          email: updatedUser.email || "",
          password: "",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Profile updated successfully",
          description: "Your profile information has been saved.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update profile",
          description: error?.message || "An error occurred while updating your profile.",
          variant: "destructive",
        });
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast({
        title: "Invalid file",
        description: "Please choose a JPG or PNG image.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum photo size is 2MB.",
        variant: "destructive",
      });
      return;
    }
    updateProfilePhotoMutation.mutate(file);
    e.target.value = "";
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  const photoSrc = getProfilePhotoSrc(user.profilePhoto);

  return (
    <DashboardLayout>
      <Header title="My Profile" />

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="backdrop-blur-sm bg-white/70 border-border shadow-card-soft">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    {photoSrc ? (
                      <AvatarImage src={photoSrc} alt={`${user.firstName} ${user.lastName}`} />
                    ) : null}
                    <AvatarFallback className="bg-accent-brand text-white text-2xl font-bold">
                      {user.firstName?.[0]?.toUpperCase()}
                      {user.lastName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-background shadow"
                    disabled={updateProfilePhotoMutation.isPending}
                    onClick={() => photoInputRef.current?.click()}
                    aria-label="Change profile photo"
                  >
                    {updateProfilePhotoMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </Button>
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click the camera icon to change your profile photo
                      </p>
                    </div>
                    {!isEditing && (
                      <Button onClick={() => setIsEditing(true)} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-brand-blue/10">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-brand-blue/10">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enrolled Courses</p>
                        <p className="font-medium">{(enrollments as any[]).length}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-brand-blue/10">
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Exams Taken</p>
                        <p className="font-medium">{(examAttempts as any[]).length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-brand-blue/10 backdrop-blur-sm border-border shadow-card-soft">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <h3 className="text-2xl font-semibold">{(enrollments as any[]).length}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-accent-brand shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border-border shadow-card-soft">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Exams</p>
                <h3 className="text-2xl font-semibold">{(examAttempts as any[]).length}</h3>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border-border shadow-card-soft">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <h3 className="text-2xl font-semibold text-green-600">Active</h3>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

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

            <TabsContent value="personal" className="space-y-6">
              <Card className="backdrop-blur-sm bg-white/70 border-border shadow-card-soft">
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
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          disabled={!isEditing}
                          className="h-11"
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...form.register("lastName")}
                          disabled={!isEditing}
                          className="h-11"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        disabled={!isEditing}
                        className="h-11"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card className="backdrop-blur-sm bg-white/70 border-border shadow-card-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Leave blank to keep your current password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={
                          isEditing ? "Leave blank to keep current password" : "••••••••"
                        }
                        {...form.register("password")}
                        disabled={!isEditing}
                        className="h-11"
                      />
                      {form.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Update Password"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" onClick={() => setIsEditing(true)} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Password
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
