import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Wallet className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">4Achievers Saket</h1>
          </div>
          <p className="text-muted-foreground text-lg">Expense Split Manager</p>
        </div>

        {/* Balances Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(balances).map(([member, balance]) => (
            <Card key={member} className="border-2 transition-all hover:shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{member}</CardTitle>
                <CardDescription className="text-sm">
                  {MEMBERS[member as keyof typeof MEMBERS] * 100}% share
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${balance > 0 ? 'text-success' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  ₹{Math.abs(balance).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {balance > 0 ? 'Gets back' : balance < 0 ? 'Owes' : 'Settled'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Expense Form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Expense
              </CardTitle>
              <CardDescription>Track a new expense for the group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Office supplies"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidBy">Paid By</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger id="paidBy">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(MEMBERS).map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <Button onClick={addExpense} className="w-full" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expense List */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Expenses
              </CardTitle>
              <CardDescription>
                Total: ₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0).toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{expense.description}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                          <span>•</span>
                          <span>{expense.paid_by}</span>
                          <span>•</span>
                          <span>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExpense(expense.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
