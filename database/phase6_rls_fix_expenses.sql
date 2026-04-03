-- ==============================================================================
-- FIX RLS: Actualización de Políticas de Seguridad para Expenses (Gastos)
-- ==============================================================================

-- 1. Eliminar las políticas previas que puedan estar bloqueando la inserción de columnas nuevas
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios gastos" ON public.expenses;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios gastos" ON public.expenses;

-- 2. Asegurarse de que el nivel de seguridad por fila (RLS) siga activo
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 3. Crear las políticas de forma absoluta garantizando acceso total al dueño del user_id
CREATE POLICY "Permitir lectura de gastos propios" 
ON public.expenses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserción de gastos propios" 
ON public.expenses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir actualización de gastos propios" 
ON public.expenses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Permitir eliminación de gastos propios" 
ON public.expenses FOR DELETE 
USING (auth.uid() = user_id);
