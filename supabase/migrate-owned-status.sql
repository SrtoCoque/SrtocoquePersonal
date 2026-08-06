-- Añadir estado "owned" = lo tengo en la estantería (sin estar leyéndolo ni terminado)
-- Ejecutar en SQL Editor de Supabase

ALTER TYPE book_status ADD VALUE IF NOT EXISTS 'owned';
