-- Script de inicialización para Módulo: Gestión de Deudas

-- 1. Crear tabla de deudas (debts)
CREATE TABLE public.debts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  remaining_amount numeric NOT NULL CHECK (remaining_amount >= 0),
  interest_rate numeric NOT NULL DEFAULT 0, -- Tasa de interés mensual %
  total_installments integer NOT NULL CHECK (total_installments > 0),
  paid_installments integer NOT NULL DEFAULT 0 CHECK (paid_installments >= 0),
  installment_amount numeric NOT NULL CHECK (installment_amount >= 0),
  start_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Reglas de Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Políticas (El usuario solo puede leer y manipular sus propias deudas)
CREATE POLICY "Usuarios pueden ver sus propias deudas" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propias deudas" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propias deudas" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar sus propias deudas" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Modificar la tabla de gastos para vincular estructuralmente el pago de una deuda
ALTER TABLE public.expenses ADD COLUMN debt_id uuid REFERENCES public.debts(id) ON DELETE SET NULL;
