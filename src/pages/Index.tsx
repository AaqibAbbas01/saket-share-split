import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, TrendingUp, Wallet, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  expense_date: string;
  created_at: string;
}

const MEMBERS = {
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
    const balances: Record<string, number> = {
      "Aaqib": 0,
      "Nawab": 0,
      "Tufail Alam Sir": 0,
    };

    expenses.forEach(expense => {
      const totalAmount = parseFloat(expense.amount.toString());
      
      // Person who paid gets credited
      balances[expense.paid_by] += totalAmount;
      
      // Everyone pays their share
      Object.entries(MEMBERS).forEach(([member, percentage]) => {
        balances[member] -= totalAmount * percentage;
      });
    });

    return balances;
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
          <h2 className="text-lg sm:text-xl font-semibold mb-4 px-1">Current Balances</h2>
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
                          {MEMBERS[member as keyof typeof MEMBERS] * 100}% share
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
                    {Object.keys(MEMBERS).map((member) => (
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
              <div className="flex items-center justify-between flex-wrap gap-2">
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
                  {expenses.map((expense, index) => (
                    <div
                      key={expense.id}
                      className="flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:shadow-lg hover:border-primary/20 transition-all group animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex-1 min-w-0 mr-2">
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
