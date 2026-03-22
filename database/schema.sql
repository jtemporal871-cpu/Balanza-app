-- Script de inicialización para Supabase SQL Editor

-- 1. Tabla: users (extensión de auth.users pública)
create table users (
  id uuid references auth.users not null primary key,
  display_name text,
  avatar_url text,
  theme_preference text default 'system',
  currency text default 'COP',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table users enable row level security;

-- Política de RLS: Un usuario solo puede ver y editar su propio perfil
create policy "Los usuarios pueden ver su propio perfil." 
  on users for select using (auth.uid() = id);

create policy "Los usuarios pueden editar su propio perfil." 
  on users for update using (auth.uid() = id);

-- Función (Trigger) para crear automáticamente un usuario público tras registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

-- Trigger para ejecutar public.handle_new_user tras insert en auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
