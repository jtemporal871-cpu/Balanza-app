-- phase9_currency.sql

-- Se agrega el soporte preferencial de moneda en la tabla transaccional del usuario
ALTER TABLE public.users 
ADD COLUMN currency text DEFAULT 'COP';
