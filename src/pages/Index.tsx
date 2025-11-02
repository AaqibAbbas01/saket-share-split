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
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'recent'>('recent');
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
    } else if (sortBy === 'amount') {
      filtered.sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()));
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 pb-8">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-foreground">4Achievers Saket</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Expense Manager</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-sm font-semibold text-foreground">Total Expenses</p>
              <p className="text-sm sm:text-lg font-bold text-primary">
                ₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-4 sm:space-y-6">

        {/* Balances Dashboard */}
        <section>
          <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">💰 Current Balances</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border">
                  <CardHeader className="pb-2 sm:pb-3">
                    <Skeleton className="h-4 sm:h-5 w-28 sm:w-32" />
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-20 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 animate-slide-up">
              {Object.entries(balances).map(([member, balance], index) => (
                <Card 
                  key={member} 
                  className="border transition-all hover:shadow-lg hover:border-primary/30 cursor-default overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`h-1 w-full ${balance > 0 ? 'bg-success' : balance < 0 ? 'bg-destructive' : 'bg-muted'}`} />
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base font-bold truncate">{member}</CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                          {(memberShares[member] * 100).toFixed(0)}% share
                        </CardDescription>
                      </div>
                      <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${balance > 0 ? 'bg-success/10' : balance < 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                        <Wallet className={`w-3 h-3 sm:w-4 sm:h-4 ${balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className={`text-xl sm:text-2xl font-bold ${balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      ₹{Math.abs(balance).toFixed(2)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium">
                      {balance > 0 ? '✓ Gets back' : balance < 0 ? '⚠ Owes' : '✓ Settled'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Add Expense Form */}
          <Card className="border lg:col-span-2 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-3 sm:px-4 py-3 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                Add Expense
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Track a new expense for the group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 px-3 sm:px-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="e.g., Office supplies, Lunch"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="amount" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                  Amount (₹)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="paidBy" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  Paid By
                </Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger id="paidBy" className="h-10 sm:h-11 text-sm sm:text-base">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(memberShares).map((member) => (
                      <SelectItem key={member} value={member} className="text-sm sm:text-base">
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="date" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-accent-foreground" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <Button 
                onClick={addExpense} 
                className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold shadow hover:shadow-lg transition-all mt-4 sm:mt-6" 
                size="lg"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expense List */}
          <Card className="border lg:col-span-3 shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2 sm:mb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-success/10">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  Recent Expenses
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm font-bold text-primary">
                  ₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0).toFixed(2)}
                </CardDescription>
              </div>
              
              {/* Filters and Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filterByUser} onValueChange={setFilterByUser}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs sm:text-sm">
                    <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Members</SelectItem>
                    {Object.keys(memberShares).map((member) => (
                      <SelectItem key={member} value={member} className="text-xs sm:text-sm">{member}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'date' | 'amount' | 'recent')}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs sm:text-sm">
                    <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent" className="text-xs sm:text-sm">Recently Added</SelectItem>
                    <SelectItem value="date" className="text-xs sm:text-sm">Sort by Date</SelectItem>
                    <SelectItem value="amount" className="text-xs sm:text-sm">Sort by Amount</SelectItem>
                  </SelectContent>
                </Select>

                {selectedExpenses.size > 0 && (
                  <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToCSV}
                      className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={exportToWhatsApp}
                      className="flex-1 sm:flex-none h-9 text-xs sm:text-sm"
                    >
                      <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              {loading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 sm:p-4 rounded-lg border bg-card">
                      <Skeleton className="h-4 sm:h-5 w-28 sm:w-32 mb-2" />
                      <Skeleton className="h-3 sm:h-4 w-40 sm:w-48" />
                    </div>
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="p-3 sm:p-4 rounded-full bg-muted w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">No expenses yet</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add your first expense to get started</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1">
                  {getSortedExpenses().length > 0 && (
                    <div className="flex items-center gap-2 pb-2 border-b sticky top-0 bg-background z-10">
                      <Checkbox
                        checked={selectedExpenses.size === getSortedExpenses().length}
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                      />
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {selectedExpenses.size > 0 ? `${selectedExpenses.size} selected` : 'Select all'}
                      </span>
                    </div>
                  )}
                  {getSortedExpenses().map((expense, index) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all group animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
                        <Checkbox
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={() => toggleExpenseSelection(expense.id)}
                          className="flex-shrink-0 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground text-xs sm:text-sm break-words leading-tight">{expense.description}</h3>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                                <span className="font-bold text-primary">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                  <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  {expense.paid_by}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
