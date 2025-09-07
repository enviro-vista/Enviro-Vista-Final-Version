import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTransactions, useTotalIncome, useMonthlyIncome } from "@/hooks/useTransactions";
import { Users, Activity, Shield, Trash2, Lock, Loader2, DollarSign, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  subscription_tier: 'free' | 'premium';
  billing_cycle?: string;
  next_billing_date?: string;
  last_payment_status?: string;
  last_payment_date?: string;
  last_payment_amount?: number;
  last_payment_currency?: string;
  created_at: string;
  is_admin: boolean;
}

interface AdminDevice {
  id: string;
  device_id: string;
  name: string;
  owner_id: string;
  owner_email: string;
  created_at: string;
}

interface AdminTransaction {
  id: string;
  stripe_session_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  billing_cycle: string;
  product_name: string;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [setupMode, setSetupMode] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Transaction data hooks
  const { data: transactions = [] } = useTransactions();
  const { data: totalIncome = 0 } = useTotalIncome();
  const { data: monthlyIncome = 0 } = useMonthlyIncome();

  // Admin setup password (hardcoded for simplicity - in production use proper auth)
  const ADMIN_SETUP_PASSWORD = "admin123";

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin || setupMode) {
      fetchUsers();
      fetchDevices();
    }
  }, [isAdmin, setupMode]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      // Check if user is admin
      const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
      if (adminError) throw adminError;

      // Check how many admins exist
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('is_admin', true);

      if (countError) throw countError;

      setAdminCount(count || 0);
      setIsAdmin(!!isAdminData);

      // If no admins exist, enable setup mode
      if (count === 0) {
        setSetupMode(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Simple query from profiles table - much faster!
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          name, 
          subscription_tier, 
          created_at, 
          is_admin,
          billing_cycle,
          next_billing_date,
          last_payment_status,
          last_payment_date,
          last_payment_amount,
          last_payment_currency
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive",
      });
    }
  };

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id, device_id, name, owner_id, created_at,
          profiles!devices_owner_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const devicesWithOwner = data?.map(device => ({
        ...device,
        owner_email: (device.profiles as any)?.email || 'Unknown'
      })) || [];

      setDevices(devicesWithOwner);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch devices.",
        variant: "destructive",
      });
    }
  };

  const updateUserTier = async (userId: string, tier: 'free' | 'premium') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User subscription updated to ${tier}.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user tier:', error);
      toast({
        title: "Error",
        description: "Failed to update user subscription.",
        variant: "destructive",
      });
    }
  };

  const deleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Device deleted successfully.",
      });

      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: "Error",
        description: "Failed to delete device.",
        variant: "destructive",
      });
    }
  };

  const makeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: true } as any)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User granted admin privileges.",
      });

      fetchUsers();
      checkAdminStatus();
    } catch (error) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: "Failed to grant admin privileges.",
        variant: "destructive",
      });
    }
  };
  // just pushng the subscribe function here for context
  const handleSetupSubmit = async () => {
    if (!setupPassword) {
      setSetupError("Please enter the setup password");
      return;
    }

    if (setupPassword !== ADMIN_SETUP_PASSWORD) {
      setSetupError("Invalid setup password");
      return;
    }

    setSetupLoading(true);

    try {
      if (!user) throw new Error("User not authenticated");

      // Make current user admin
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: true } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Admin Setup Complete",
        description: "You now have administrator privileges.",
      });

      setIsAdmin(true);
      setSetupMode(false);
    } catch (error) {
      console.error('Error completing admin setup:', error);
      setSetupError("Failed to complete setup. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Admin setup screen (when no admins exist)
  if (setupMode) {
    return (
      <AppLayout 
        title="Admin Setup"
        subtitle="Complete initial administrator setup"
        breadcrumbs={[{ title: "Admin" }, { title: "Setup" }]}
      >
        <div className="max-w-md mx-auto">
        <Card className="border border-blue-500">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <CardTitle className="text-2xl">Admin Setup Required</CardTitle>
            <p className="text-muted-foreground">
              No administrator accounts exist. Complete setup to continue.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-password">Setup Password</Label>
                <Input
                  id="setup-password"
                  type="password"
                  placeholder="Enter setup password"
                  value={setupPassword}
                  onChange={(e) => {
                    setSetupPassword(e.target.value);
                    setSetupError("");
                  }}
                />
                {setupError && (
                  <p className="text-sm text-red-500">{setupError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You need the admin setup password to complete this process
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleSetupSubmit}
                disabled={setupLoading}
              >
                {setupLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Complete Admin Setup
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>After setup, you'll have full administrator privileges.</p>
          <p className="mt-2">
            Contact support if you've lost the setup password.
          </p>
        </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout 
        title="Access Denied"
        subtitle="Administrator privileges required"
        breadcrumbs={[{ title: "Admin" }]}
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You don't have administrator privileges to access this page.
              </p>
              {adminCount === 0 ? (
                <Button onClick={() => setSetupMode(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Setup Admin Account
                </Button>
              ) : (
                <p className="text-sm">
                  Contact an administrator to request access.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Admin Dashboard"
      subtitle="Manage users, devices, and platform settings"
      breadcrumbs={[{ title: "Administration" }, { title: "Dashboard" }]}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_admin).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(totalIncome / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month: ${(monthlyIncome / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.status === 'paid').length} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(monthlyIncome / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${transactions.length > 0 ? (transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length / 100).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="admin">Admin Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_tier === 'premium' ? 'default' : 'secondary'}>
                          {user.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.billing_cycle ? (
                          <Badge variant="outline">
                            {user.billing_cycle}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.next_billing_date ? (
                          new Date(user.next_billing_date).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.last_payment_date ? (
                          <div>
                            <div>{new Date(user.last_payment_date).toLocaleDateString()}</div>
                            {user.last_payment_status && (
                              <Badge 
                                variant={user.last_payment_status === 'succeeded' ? 'default' : 'secondary'}
                                className="text-xs mt-1"
                              >
                                {user.last_payment_status}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.last_payment_amount ? (
                          <div className="font-mono">
                            ${(user.last_payment_amount / 100).toFixed(2)} {user.last_payment_currency?.toUpperCase() || 'USD'}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_admin ? 'default' : 'outline'}>
                          {user.is_admin ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Select
                          value={user.subscription_tier}
                          onValueChange={(value: 'free' | 'premium') => updateUserTier(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>

                        {!user.is_admin && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => makeAdmin(user.id)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Make Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono text-sm">{device.device_id}</TableCell>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{device.owner_email}</TableCell>
                      <TableCell>
                        {new Date(device.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Device</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete device {device.device_id}? This action cannot be undone and will also delete all associated sensor readings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDevice(device.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <Table>
                                      <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Billing Cycle</TableHead>
                        <TableHead>Next Billing</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.customer_email}</TableCell>
                        <TableCell className="font-mono">
                          ${(transaction.amount / 100).toFixed(2)} {transaction.currency.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={transaction.status === 'paid' ? 'default' : 'secondary'}
                            className={transaction.status === 'paid' ? 'bg-green-500' : ''}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.billing_cycle}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.next_billing_date ? 
                            new Date(transaction.next_billing_date).toLocaleDateString() : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>{transaction.product_name}</TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Admin Accounts</h3>
                  <div className="space-y-3">
                    {users.filter(u => u.is_admin).map(admin => (
                      <div key={admin.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{admin.name || admin.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Added: {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="default">Administrator</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Danger Zone</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Reset Setup Mode</p>
                        <p className="text-sm text-muted-foreground">
                          Allow admin setup again (requires setup password)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setSetupMode(true)}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Reset Setup
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Admin;