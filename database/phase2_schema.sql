-- Script de inicialización para Fase 2: Participantes y Categorías

-- 1. Tabla: participants
create table public.participants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para participants
alter table public.participants enable row level security;

-- Políticas para participants (El dueño del registro es quien tiene control)
create policy "Usuarios pueden ver sus propios participantes" on public.participants
  for select using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus propios participantes" on public.participants
  for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propios participantes" on public.participants
  for update using (auth.uid() = user_id);

create policy "Usuarios pueden borrar sus propios participantes" on public.participants
  for delete using (auth.uid() = user_id);


-- 2. Tabla: categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  icon text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para categories
alter table public.categories enable row level security;

-- Políticas para categories
create policy "Usuarios pueden ver sus propias categorías" on public.categories
  for select using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus propias categorías" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propias categorías" on public.categories
  for update using (auth.uid() = user_id);

create policy "Usuarios pueden borrar sus propias categorías" on public.categories
  for delete using (auth.uid() = user_id);
