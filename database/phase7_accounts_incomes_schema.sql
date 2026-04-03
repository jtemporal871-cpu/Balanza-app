-- phase7_accounts_incomes_schema.sql

-- Tabla "accounts" (Cuentas/Billeteras)
CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('banco', 'billetera', 'efectivo')),
    balance numeric DEFAULT 0,
    color text,
    icon text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
    ON public.accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
    ON public.accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
    ON public.accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
    ON public.accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Tabla "incomes" (Ingresos)
CREATE TABLE public.incomes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) NOT NULL,
    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    category text NOT NULL CHECK (category IN ('salario', 'freelance', 'arriendo', 'transferencia', 'otro')),
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own incomes"
    ON public.incomes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes"
    ON public.incomes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes"
    ON public.incomes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes"
    ON public.incomes FOR DELETE
    USING (auth.uid() = user_id);

-- Tabla "expenses" (Modificación)
ALTER TABLE public.expenses 
ADD COLUMN account_id uuid REFERENCES public.accounts(id) NULL;
