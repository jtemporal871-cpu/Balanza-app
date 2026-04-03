-- phase8_categories_type.sql

-- 1. Agregamos el tipo a la tabla de categorías
ALTER TABLE public.categories 
ADD COLUMN type text NOT NULL DEFAULT 'gasto' 
CHECK (type IN ('gasto', 'ingreso'));

-- 2. Quitamos el CHECK fijo en incomes y cambiamos a llave foránea
-- (Borrando la columna de texto antigua e insertando el id relacional)
ALTER TABLE public.incomes
DROP COLUMN category;

ALTER TABLE public.incomes
ADD COLUMN category_id uuid REFERENCES public.categories(id);
