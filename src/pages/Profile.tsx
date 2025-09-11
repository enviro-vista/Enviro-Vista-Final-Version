import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Eye, 
  EyeOff,
  Save,
  CheckCircle,
  AlertCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscriptionStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // User profile state
  const [userProfile, setUserProfile] = useState({
    email: '',
    createdAt: '',
    lastSignIn: '',
    subscriptionStatus: ''
  });

  // Load user profile data
  useEffect(() => {
    if (user) {
      setUserProfile({
        email: user.email || '',
        createdAt: user.created_at || '',
        lastSignIn: user.last_sign_in_at || '',
        subscriptionStatus: isPremium ? 'Premium' : 'Free'
      });
    }
  }, [user, isPremium]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast({
        title: "Same Password",
        description: "New password must be different from current password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword
      });

      if (signInError) {
        toast({
          title: "Incorrect Current Password",
          description: "The current password you entered is incorrect.",
          variant: "destructive"
        });
        return;
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });

      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: "Invalid Confirmation",
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Soft delete: Update user metadata and profiles table
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          deleted_at: new Date().toISOString(),
          deleted_by: 'self',
          status: 'deleted'
        }
      });

      if (authError) {
        throw authError;
      }

      // Also update the profiles table
      // Temporarily disabled until migration is applied
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: 'self'
        })
        .eq('id', user?.id);

      if (profileError) {
        throw profileError;
      }

      // Sign out the user after successful deletion
      await supabase.auth.signOut();

      // Clear all Supabase auth tokens from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('sb-') && key.includes('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({
        title: "Account Deleted",
        description: "Your account has been deactivated and can be restored by an administrator.",
      });

      // Redirect will happen automatically due to sign out

    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout 
      title="Profile Settings"
      subtitle="Manage your account and security settings"
      breadcrumbs={[{ title: "Profile" }]}
    >
      <div className="space-y-6">
        
        {/* User Information Card */}
        <Card className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Account Information</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Email Address</Label>
                    <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Member Since</Label>
                    <p className="text-sm text-muted-foreground">
                      {userProfile.createdAt ? format(new Date(userProfile.createdAt), 'MMMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Subscription Status</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{userProfile.subscriptionStatus}</p>
                      {isPremium ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card className="glass-card p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Enter your new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Security Tips Card */}
        <Card className="glass-card p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Tips
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Use a strong, unique password that you don't use elsewhere</p>
              <p>• Consider using a password manager to generate and store passwords</p>
              <p>• Never share your password with anyone</p>
              <p>• Log out from shared or public computers</p>
            </div>
          </div>
        </Card>

        {/* Danger Zone - Delete Account */}
        <Card className="glass-card p-6 border-red-200 dark:border-red-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-red-600 dark:text-red-400">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently deactivate your account. This action can be reversed by an administrator.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                    Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="max-w-xs"
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                      className="w-fit"
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>This action will:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Deactivate your account immediately</li>
                          <li>Sign you out of all sessions</li>
                          <li>Preserve your data for potential restoration</li>
                          <li>Require administrator intervention to restore</li>
                        </ul>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          This action cannot be undone by you.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProfile}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
