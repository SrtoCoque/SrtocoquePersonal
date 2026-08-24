# Deporte 2 — openGym (adaptado)

Código basado en [openGym](https://gitlab.com/DuarteSantos8/opengym) (AGPL-3.0).

## Adaptaciones en Callejón Diagon

- Auth: sesión de Supabase (no passkeys propias)
- Persistencia: tabla `user_opengym_state` en Supabase (JSON)
- Hosting: Next.js / Vercel, ruta `/deporte-2`
- Media de ejercicios: CDN jsDelivr del dataset upstream (ver `NOTICE.md`)
- Sin Docker, Capacitor, admin ni push notifications

Licencia original: `LICENSE-AGPL`.
