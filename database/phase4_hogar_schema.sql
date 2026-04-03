-- Script de inicialización para Fase 4: Hogares Compartidos (Parejas)

-- 1. Tabla: hogares
CREATE TABLE public.hogares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.hogares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura de hogar si perteneces a él" ON public.hogares
  FOR SELECT USING (id = (SELECT hogar_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Cualquier usuario puede registrar un hogar nuevo" ON public.hogares
  FOR INSERT WITH CHECK (true);

-- 2. Modificar tabla users (suponiendo que ya existe)
ALTER TABLE public.users ADD COLUMN hogar_id uuid REFERENCES public.hogares(id) ON DELETE SET NULL;

-- 3. Función Helper para simplificar RLS cruzado
-- Devuelve el hogar_id del usuario que está haciendo la petición
CREATE OR REPLACE FUNCTION public.get_auth_hogar_id()
RETURNS uuid AS $$
  SELECT hogar_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- 4. Añadir hogar_id a todas las tablas transaccionales
ALTER TABLE public.participants ADD COLUMN hogar_id uuid REFERENCES public.hogares(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN hogar_id uuid REFERENCES public.hogares(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN hogar_id uuid REFERENCES public.hogares(id) ON DELETE CASCADE;
ALTER TABLE public.settlements ADD COLUMN hogar_id uuid REFERENCES public.hogares(id) ON DELETE CASCADE;

-- 5. Actualizar Políticas RLS de Gastos (Expenses)
-- Desactivar políticas antiguas
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios gastos" ON public.expenses;

-- Nuevas políticas de hogar
CREATE POLICY "Lectura de gastos del hogar" ON public.expenses 
  FOR SELECT USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());
CREATE POLICY "Inserción de gastos del hogar" ON public.expenses 
  FOR INSERT WITH CHECK (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());
CREATE POLICY "Actualizar gastos del hogar" ON public.expenses 
  FOR UPDATE USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());
CREATE POLICY "Borrar gastos del hogar" ON public.expenses 
  FOR DELETE USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());


-- 6. Actualizar Políticas RLS de Participantes y Liquidaciones
-- Participantes
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios participantes" ON public.participants;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios participantes" ON public.participants;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios participantes" ON public.participants;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios participantes" ON public.participants;

CREATE POLICY "Lectura y Escritura de Participantes Compartidos" ON public.participants 
  FOR ALL USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());

-- Liquidaciones (Settlements)
DROP POLICY IF EXISTS "Usuarios pueden ver sus liquidaciones" ON public.settlements;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus liquidaciones" ON public.settlements;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus liquidaciones" ON public.settlements;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus liquidaciones" ON public.settlements;

CREATE POLICY "Lectura y Escritura de Liquidaciones Compartidas" ON public.settlements 
  FOR ALL USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());

-- Categorías
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias categorías" ON public.categories;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias categorías" ON public.categories;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias categorías" ON public.categories;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propias categorías" ON public.categories;

CREATE POLICY "Lectura y Escritura de Categorías Compartidas" ON public.categories 
  FOR ALL USING (hogar_id = public.get_auth_hogar_id() OR user_id = auth.uid());
