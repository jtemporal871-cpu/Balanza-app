-- database/phase10_expense_justification.sql
-- Agregar columna para marcar gastos como justificación de una deuda
ALTER TABLE public.expenses 
ADD COLUMN is_debt_justification boolean NOT NULL DEFAULT false;
