-- database/phase9_debts_insurance_schema.sql
-- Agregamos la columna para el seguro mensual sin afectar registros previos
ALTER TABLE public.debts 
ADD COLUMN insurance_amount numeric NOT NULL DEFAULT 0;
