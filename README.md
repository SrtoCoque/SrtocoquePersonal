# Estantería

Aplicación web de gestión personal de libros (Next.js + Supabase + Google Books).

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase** Auth + PostgreSQL (RLS)
- **Google Books API** para búsqueda y auto-completado
- Desplegable en **Vercel**

## 1. Configurar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el script completo de `supabase/schema.sql`.
3. En **Authentication → Providers**, deja Email habilitado (password + Magic Link).
4. En **Authentication → URL Configuration**, añade:
   - Site URL: `http://localhost:3000` (y luego tu dominio de Vercel)
   - Redirect URLs: `http://localhost:3000/auth/callback` y `https://tu-dominio.vercel.app/auth/callback`
5. Copia **Project URL** y **anon public key** desde **Project Settings → API**.

## 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Rellena:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 4. Despliegue en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel.
3. Añade las mismas variables de entorno.
4. Actualiza las Redirect URLs en Supabase con tu dominio de Vercel.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` `/register` | Autenticación (email/password + Magic Link) |
| `/library` | Biblioteca con filtros y CRUD |
| `/stats` | Dashboard de métricas y gráfico mensual |
| `/api/books/search?q=` | Proxy serverless a Google Books |

## Estructura relevante

```
src/
  app/                 # Rutas App Router
  components/          # UI, auth, libros, stats
  lib/supabase/        # Clientes browser / server / middleware
  lib/google-books.ts  # Integración Google Books
supabase/schema.sql    # Tablas + RLS + trigger de profiles
```
