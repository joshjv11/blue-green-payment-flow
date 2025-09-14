import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useEmailReminders } from '@/hooks/useEmailReminders';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Building, Mail, FileText, ArrowRight, Plus, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, BarChart3, Settings, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseISO, differenceInDays, isBefore, isToday, isAfter, addDays, format } from 'date-fns';
import ExportImport from '@/components/ExportImport';

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [localBills, setLocalBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);
  const [showExportImport, setShowExportImport] = useState(false);
  
  // Initialize notifications and email reminders
  useNotifications();
  useEmailReminders();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBills();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFullName(data.full_name || '');
        setCompany(data.company || '');
      } else {
        // localStorage mode - get user data from the user object
        const userData = {
          id: user!.id,
          email: user!.email,
          full_name: (user as any).full_name || null,
          company: (user as any).company || null,
        };
        setProfile(userData);
        setFullName(userData.full_name || '');
        setCompany(userData.company || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBills = async () => {
    try {
      setBillsLoading(true);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user!.id)
          .order('due_date', { ascending: true });

        if (error) throw error;

        // Auto-update overdue bills
        const updatedBills = data.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
      } else {
        // localStorage mode
        const updatedBills = localBills.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
        
        // Update overdue bills in localStorage
        const hasOverdueChanges = updatedBills.some((bill, index) => 
          bill.status !== localBills[index]?.status
        );
        
        if (hasOverdueChanges) {
          setLocalBills(updatedBills);
        }
      }
    } catch (error: any) {
      console.error('Error fetching bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await updateProfile(fullName, company);
      await fetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBillStatus = async (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('bills')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', bill.id);

        if (error) throw error;
      } else {
        // localStorage mode
        const updatedBills = localBills.map(b =>
          b.id === bill.id ? { ...b, status: newStatus as 'unpaid' | 'paid' | 'overdue', updated_at: new Date().toISOString() } : b
        );
        setLocalBills(updatedBills);
      }

      toast({
        title: `Bill marked as ${newStatus}!`,
      });
      await fetchBills();
    } catch (error: any) {
      toast({
        title: "Error updating bill status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportBills = async (importedBills: Partial<Bill>[]) => {
    try {
      const billsToImport = importedBills.map(bill => ({
        ...bill,
        id: bill.id || crypto.randomUUID(),
        user_id: user!.id,
        created_at: bill.created_at || new Date().toISOString(),
        updated_at: bill.updated_at || new Date().toISOString(),
      })) as Bill[];

      if (isSupabaseConfigured && supabase) {
        // For Supabase, insert the bills
        const { error } = await supabase
          .from('bills')
          .insert(billsToImport);

        if (error) throw error;
      } else {
        // For localStorage, merge with existing bills
        const existingIds = new Set(localBills.map(b => b.id));
        const newBills = billsToImport.filter(b => !existingIds.has(b.id));
        setLocalBills([...localBills, ...newBills]);
      }

      await fetchBills();
      toast({
        title: "Bills imported successfully!",
        description: `Added ${billsToImport.length} bills to your account.`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const activeBills = bills.filter(bill => bill.status !== 'paid');
  const overdueBills = bills.filter(bill => bill.status === 'overdue');
  const billsDueIn7Days = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    return bill.status === 'unpaid' && daysUntilDue >= 0 && daysUntilDue <= 7;
  });
  const paidBills = bills.filter(bill => bill.status === 'paid');
  const billsDueToday = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    return bill.status === 'unpaid' && isToday(dueDate);
  });

  const getBillStatusColor = (bill: Bill) => {
    if (bill.status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
    if (bill.status === 'overdue') return 'bg-red-100 text-red-800 border-red-200';
    
    const daysUntilDue = differenceInDays(parseISO(bill.due_date), new Date());
    if (daysUntilDue <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">InvoiceFlow</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-sm text-muted-foreground">
                Welcome, {profile?.full_name || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-1 sm:space-x-2 h-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xs:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Welcome to your Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your bills, track payments, and stay on top of your finances.
            </p>
          </div>

          {/* Bill Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card className="shadow-soft">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{activeBills.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Active Bills</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-destructive">{overdueBills.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Overdue Bills</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">{billsDueIn7Days.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Due in 7 Days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{paidBills.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Paid Bills</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bills Due Today */}
          {billsDueToday.length > 0 && (
            <Card className="shadow-soft border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-800">
                  <Calendar className="h-5 w-5" />
                  <span>Bills Due Today ({billsDueToday.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {billsDueToday.map((bill) => (
                  <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{bill.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${bill.amount.toFixed(2)} • {bill.category.charAt(0).toUpperCase() + bill.category.slice(1)}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => toggleBillStatus(bill)}
                      className="bg-green-600 hover:bg-green-700 h-9 w-full sm:w-auto"
                    >
                      Mark as Paid
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button 
                onClick={() => navigate('/bills')}
                className="h-auto p-3 sm:p-4 justify-start min-h-[48px]"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Add New Bill</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Create a new bill entry</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/bills')}
                className="h-auto p-3 sm:p-4 justify-start min-h-[48px]"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Manage Bills</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">View and edit all bills</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/analytics')}
                className="h-auto p-3 sm:p-4 justify-start min-h-[48px]"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">View Analytics</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Financial insights and reports</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/settings')}
                className="h-auto p-3 sm:p-4 justify-start min-h-[48px]"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Settings</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Manage preferences and notifications</div>
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => setShowExportImport(true)}
                className="h-auto p-3 sm:p-4 justify-start min-h-[48px] sm:col-span-2"
                variant="outline"
              >
                <div className="flex items-center space-x-3">
                  <Download className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Export/Import Bills</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Backup or import your bill data</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Bills Table */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {billsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bills yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first bill</p>
                  <Button onClick={() => navigate('/bills')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Bill
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Bill Name</TableHead>
                          <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm">Due Date</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.slice(0, 5).map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{bill.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm">${bill.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className={`${getBillStatusColor(bill)} text-xs`}>
                                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleBillStatus(bill)}
                                disabled={bill.status === 'paid'}
                                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                              >
                                {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                              </Button>
                            </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                   {bills.length > 5 && (
                     <div className="text-center mt-4">
                       <Button variant="outline" onClick={() => navigate('/bills')}>
                         View All Bills
                         <ArrowRight className="h-4 w-4 ml-2" />
                       </Button>
                     </div>
                   )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export/Import Section */}
          {showExportImport && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Export/Import Bills</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowExportImport(false)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExportImport 
                  bills={bills} 
                  onImportBills={handleImportBills}
                  userId={user!.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Profile Card */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Full Name:</span>
                    <span className="font-medium">{profile?.full_name || 'Not set'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Company:</span>
                    <span className="font-medium">{profile?.company || 'Not set'}</span>
                  </div>
                  
                  <Button onClick={() => setIsEditing(true)} className="mt-4">
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Enter your company name"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setFullName(profile?.full_name || '');
                        setCompany(profile?.company || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;