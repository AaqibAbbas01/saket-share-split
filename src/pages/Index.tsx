import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, TrendingUp, Wallet, Calendar, DollarSign, Download, Share2, Filter, ArrowUpDown, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  expense_date: string;
  created_at: string;
}

type MemberShares = {
  [key: string]: number;
};

const DEFAULT_MEMBERS: MemberShares = {
  "Aaqib": 0.30,
  "Nawab": 0.30,
  "Tufail Alam Sir": 0.40,
};

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [filterByUser, setFilterByUser] = useState<string>('all');
  const [memberShares, setMemberShares] = useState<MemberShares>(DEFAULT_MEMBERS);
  const [editingShares, setEditingShares] = useState(false);
  const [tempShares, setTempShares] = useState<MemberShares>(DEFAULT_MEMBERS);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    
    Object.keys(memberShares).forEach(member => {
      balances[member] = 0;
    });

    expenses.forEach(expense => {
      const totalAmount = parseFloat(expense.amount.toString());
      
      // Person who paid gets credited
      balances[expense.paid_by] += totalAmount;
      
      // Everyone pays their share
      Object.entries(memberShares).forEach(([member, percentage]) => {
        balances[member] -= totalAmount * percentage;
      });
    });

    return balances;
  };

  const getSortedExpenses = () => {
    let filtered = [...expenses];
    
    // Filter by user
    if (filterByUser !== 'all') {
      filtered = filtered.filter(exp => exp.paid_by === filterByUser);
    }
    
    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    } else {
      filtered.sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()));
    }
    
    return filtered;
  };

  const toggleExpenseSelection = (id: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedExpenses(newSelected);
  };

  const toggleSelectAll = () => {
    const sortedExpenses = getSortedExpenses();
    if (selectedExpenses.size === sortedExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(sortedExpenses.map(exp => exp.id)));
    }
  };

  const exportToCSV = () => {
    const selected = expenses.filter(exp => selectedExpenses.has(exp.id));
    if (selected.length === 0) {
      toast.error("Please select expenses to export");
      return;
    }

    const headers = ['Date', 'Description', 'Amount (₹)', 'Paid By'];
    const rows = selected.map(exp => [
      format(new Date(exp.expense_date), 'dd/MM/yyyy'),
      exp.description,
      parseFloat(exp.amount.toString()).toFixed(2),
      exp.paid_by
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully!");
  };

  const exportToWhatsApp = () => {
    const selected = expenses.filter(exp => selectedExpenses.has(exp.id));
    if (selected.length === 0) {
      toast.error("Please select expenses to export");
      return;
    }

    let message = `*4Achievers Saket - Expense Report*\n\n`;
    
    selected.forEach(exp => {
      message += `📅 ${format(new Date(exp.expense_date), 'dd MMM yyyy')}\n`;
      message += `💰 ₹${parseFloat(exp.amount.toString()).toFixed(2)} - ${exp.description}\n`;
      message += `👤 Paid by: ${exp.paid_by}\n\n`;
    });

    const total = selected.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    message += `*Total: ₹${total.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const saveShares = () => {
    const total = Object.values(tempShares).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 1) > 0.001) {
      toast.error("Shares must add up to 100%");
      return;
    }
    setMemberShares(tempShares);
    setEditingShares(false);
    toast.success("Shares updated successfully!");
  };

  const cancelEditShares = () => {
    setTempShares(memberShares);
    setEditingShares(false);
  };

  const addExpense = async () => {
    if (!description || !amount || !paidBy) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .insert({
          description,
          amount: parseFloat(amount),
          paid_by: paidBy,
          expense_date: expenseDate,
        });

      if (error) throw error;

      toast.success("Expense added successfully!");
      setDescription("");
      setAmount("");
      setPaidBy("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Expense deleted");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const balances = calculateBalances();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">4Achievers Saket</h1>
                <p className="text-xs text-muted-foreground">Expense Manager</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-primary">
                ₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">

        {/* Balances Dashboard */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg sm:text-xl font-semibold">Current Balances</h2>
            <Dialog open={editingShares} onOpenChange={setEditingShares}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setTempShares(memberShares)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Shares
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Member Shares</DialogTitle>
                  <DialogDescription>
                    Adjust the percentage share for each member. Total must equal 100%.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {Object.entries(tempShares).map(([member, share]) => (
                    <div key={member} className="space-y-2">
                      <Label>{member}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={(share * 100).toFixed(0)}
                          onChange={(e) => setTempShares({
                            ...tempShares,
                            [member]: parseFloat(e.target.value) / 100
                          })}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold">
                      Total: {(Object.values(tempShares).reduce((sum, val) => sum + val, 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEditShares}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveShares}>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-2">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-slide-up">
              {Object.entries(balances).map(([member, balance], index) => (
                <Card 
                  key={member} 
                  className="border-2 transition-all hover:shadow-xl hover:-translate-y-1 cursor-default overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`h-1 w-full ${balance > 0 ? 'bg-success' : balance < 0 ? 'bg-destructive' : 'bg-muted'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg font-semibold">{member}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1">
                          {(memberShares[member] * 100).toFixed(0)}% share
                        </CardDescription>
                      </div>
                      <div className={`p-2 rounded-full ${balance > 0 ? 'bg-success/10' : balance < 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                        <Wallet className={`w-4 h-4 ${balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl sm:text-3xl font-bold ${balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      ₹{Math.abs(balance).toFixed(2)}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                      {balance > 0 ? '✓ Gets back' : balance < 0 ? '⚠ Owes' : '✓ Settled'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Add Expense Form */}
          <Card className="border-2 lg:col-span-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                Add Expense
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track a new expense for the group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="e.g., Office supplies, Lunch, Transport"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  Amount (₹)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidBy" className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Paid By
                </Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger id="paidBy" className="h-11 text-base">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(memberShares).map((member) => (
                      <SelectItem key={member} value={member} className="text-base">
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-11 text-base"
                />
              </div>

              <Button 
                onClick={addExpense} 
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all mt-6" 
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expense List */}
          <Card className="border-2 lg:col-span-3 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  </div>
                  Recent Expenses
                </CardTitle>
                <CardDescription className="text-sm sm:text-base font-semibold text-primary">
                  Total: ₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0).toFixed(2)}
                </CardDescription>
              </div>
              
              {/* Filters and Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={filterByUser} onValueChange={setFilterByUser}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {Object.keys(memberShares).map((member) => (
                      <SelectItem key={member} value={member}>{member}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'date' | 'amount')}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="amount">Sort by Amount</SelectItem>
                  </SelectContent>
                </Select>

                {selectedExpenses.size > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToCSV}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToWhatsApp}
                      className="flex-1 sm:flex-none"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-muted-foreground">No expenses yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your first expense to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {getSortedExpenses().length > 0 && (
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedExpenses.size === getSortedExpenses().length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedExpenses.size > 0 ? `${selectedExpenses.size} selected` : 'Select all'}
                      </span>
                    </div>
                  )}
                  {getSortedExpenses().map((expense, index) => (
                    <div
                      key={expense.id}
                      className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:shadow-lg hover:border-primary/20 transition-all group animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                        <Checkbox
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={() => toggleExpenseSelection(expense.id)}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 sm:gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5 sm:mt-0">
                            <DollarSign className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base break-words">{expense.description}</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                              <span className="font-semibold text-primary">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                <Wallet className="w-3 h-3" />
                                {expense.paid_by}
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExpense(expense.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-9 w-9 transition-all group-hover:opacity-100 sm:opacity-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
