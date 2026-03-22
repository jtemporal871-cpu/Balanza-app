-- Script de inicialización para Fase 3: Gastos y Divisiones

-- 1. Tabla: expenses
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null default auth.uid(),
  payer_id uuid references public.participants(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  split_type text not null default 'equal', -- Opciones: 'equal', 'percentages', 'exact_amounts'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para expenses
alter table public.expenses enable row level security;

-- Políticas para expenses
create policy "Usuarios pueden ver sus propios gastos" on public.expenses
  for select using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus propios gastos" on public.expenses
  for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propios gastos" on public.expenses
  for update using (auth.uid() = user_id);

create policy "Usuarios pueden borrar sus propios gastos" on public.expenses
  for delete using (auth.uid() = user_id);


-- 2. Tabla: expense_splits (Detalle de quién debe cuánto por cada gasto)
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  participant_id uuid references public.participants(id) on delete cascade not null,
  amount_owed numeric not null check (amount_owed >= 0),
  percentage numeric, -- opcional si el split fue por porcentaje
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para expense_splits
alter table public.expense_splits enable row level security;

-- Políticas para expense_splits 
-- (Solo permitimos acceso si el gasto al que está asociado pertenece al usuario actual)
create policy "Ver divisiones de mis gastos" on public.expense_splits
  for select using (
    exists (select 1 from public.expenses where id = expense_splits.expense_id and user_id = auth.uid())
  );

create policy "Insertar divisiones de mis gastos" on public.expense_splits
  for insert with check (
    exists (select 1 from public.expenses where id = expense_splits.expense_id and user_id = auth.uid())
  );

create policy "Actualizar divisiones de mis gastos" on public.expense_splits
  for update using (
    exists (select 1 from public.expenses where id = expense_splits.expense_id and user_id = auth.uid())
  );

create policy "Borrar divisiones de mis gastos" on public.expense_splits
  for delete using (
    exists (select 1 from public.expenses where id = expense_splits.expense_id and user_id = auth.uid())
  );


-- 3. Tabla: settlements (Liquidaciones, que guardan los pagos que se hacen para saldar deudas)
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null default auth.uid(),
  payer_id uuid references public.participants(id) on delete cascade not null,
  payee_id uuid references public.participants(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para settlements
alter table public.settlements enable row level security;

-- Políticas para settlements
create policy "Usuarios pueden ver sus liquidaciones" on public.settlements
  for select using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus liquidaciones" on public.settlements
  for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus liquidaciones" on public.settlements
  for update using (auth.uid() = user_id);

create policy "Usuarios pueden borrar sus liquidaciones" on public.settlements
  for delete using (auth.uid() = user_id);
