-- database/phase11_debt_categories.sql
-- Paso 1: Crear tabla de categorías de deudas
CREATE TABLE IF NOT EXISTS public.debt_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    icon text,
    color text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.debt_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para debt_categories
CREATE POLICY "Users can view their own debt categories" 
ON public.debt_categories FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debt categories" 
ON public.debt_categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debt categories" 
ON public.debt_categories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debt categories" 
ON public.debt_categories FOR DELETE 
USING (auth.uid() = user_id);

-- Paso 2: Modificar tabla de deudas para incluir la categoría
ALTER TABLE public.debts 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.debt_categories(id) ON DELETE SET NULL;
