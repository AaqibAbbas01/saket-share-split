-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  paid_by TEXT NOT NULL CHECK (paid_by IN ('Aaqib', 'Nawab', 'Tufail Alam Sir')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view expenses (public app)
CREATE POLICY "Anyone can view expenses"
  ON public.expenses
  FOR SELECT
  USING (true);

-- Allow anyone to insert expenses (public app)
CREATE POLICY "Anyone can insert expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete expenses (public app)
CREATE POLICY "Anyone can delete expenses"
  ON public.expenses
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_paid_by ON public.expenses(paid_by);