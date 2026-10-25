# Plan de Correccion: Autenticacion JWT por Peticion y Eliminacion del Bucle de Login

## 1. Diagnostico de la Causa Raiz

1. **Colision en el cliente global de Supabase en el servidor**:
   - Actualmente, el backend en Render instancia un unico cliente global de Supabase (`createClient(SUPABASE_URL, SUPABASE_KEY)`).
   - Al cargar las vistas de Caja o Inventario, el frontend lanza multiples peticiones en paralelo (`GET /platos`, `GET /categorias`, `GET /ordenes/activas`). Llamar a `supabase.auth.setSession()` concurrentemente sobre la misma instancia global —o recibir un intento fallido en `POST /auth/login` (`Invalid login credentials`)— reinicia el estado de autenticacion en memoria del servidor al rol anonimo (`anon`).
   - Cuando las consultas se ejecutan con el rol `anon`, las politicas RLS de Supabase devuelven arreglos vacios (`[]`) en las lecturas (`GET /platos`, `GET /categorias`) y rechazan las escrituras (`new row violates row-level security policy for table "categorias"`).

2. **Bucle infinito de redireccion al Login ante errores de RLS**:
   - El manejador de errores del backend convierte cualquier error de `row-level security policy` en un codigo HTTP `401`.
   - En el frontend, el interceptor de Axios interpreta cualquier `401` como sesion invalida, borra `localStorage` y redirige a `/login`. Al volver a iniciar sesion y reintentar la accion, se repite el ciclo indefinidamente.

---

## 2. Arquitectura de la Solucion

### A. Cliente Supabase aislado por peticion con `AsyncLocalStorage` (`/backend/src/config/supabase.js`)
- Implementar un contexto por peticion HTTP utilizando `AsyncLocalStorage` de Node.js.
- Por cada peticion entrante que incluya `Authorization: Bearer <access_token>`, crear un cliente ligero de Supabase con `persistSession: false`, `autoRefreshToken: false` y la cabecera global `Authorization: Bearer <access_token>` inyectada directamente en PostgREST.
- Exponer un proxy transparente en el modulo `supabase` para que todos los servicios existentes (`menuService`, `orderService`, `reportService`, `deliveryService`) ejecuten automaticamente sus consultas `.from(...)` con el token JWT del usuario autenticado en esa peticion, sin compartir estado mutable entre peticiones ni verse afectados por intentos fallidos en `/auth/login`.

### B. Middleware de verificacion y renovacion transparente de token (`/backend/src/app.js`)
- En las rutas protegidas, extraer el `Bearer <access_token>` y el `X-Refresh-Token` enviados por el frontend.
- Verificar si el JWT ha expirado decodificando su carga util (`exp`). Si el `access_token` esta vencido y existe `X-Refresh-Token`, renovar la sesion mediante `refreshSession` en una instancia aislada y devolver los nuevos tokens en las cabeceras `x-access-token` y `x-refresh-token` (expuestas mediante CORS `exposedHeaders`) para que el frontend actualice su `localStorage` sin interrumpir la operacion del usuario.
- Separar los codigos de estado en `errorHandler`:
  - `401 Unauthorized`: Unicamente cuando no se envie un token valido o el JWT sea invalido/expirado y no pueda renovarse.
  - `403 Forbidden`: Cuando un usuario autenticado intente una operacion bloqueada por una politica RLS en Supabase, mostrando el mensaje en pantalla sin cerrar la sesion ni redirigir al login.

### C. Aislamiento del inicio de sesion (`/backend/src/services/authService.js`)
- Ejecutar `signInWithPassword` sobre un cliente sin persistencia (`persistSession: false`) para garantizar que un error de contrasena en un dispositivo nunca altere las peticiones de otros dispositivos conectados.
- Devolver un mensaje claro en espanol cuando Supabase responda `Invalid login credentials`.

### D. Sincronizacion de tokens renovados en el Frontend (`/frontend/src/api/config.js` y `/frontend/src/api/authService.js`)
- Actualizar el interceptor de respuestas en `/frontend/src/api/config.js` para capturar las cabeceras `x-access-token` y `x-refresh-token` cuando el backend renueve automaticamente el JWT, actualizando `localStorage` de forma transparente.
- Limpiar cualquier token residual invalido y redirigir a `/login` unicamente ante respuestas `401` reales de sesion no autenticada.

---

## 3. Archivos a Modificar

1. `/backend/src/config/supabase.js`: Incorporar `AsyncLocalStorage`, `runWithToken(accessToken, callback)` y creacion de cliente por token JWT sin estado compartido.
2. `/backend/src/services/authService.js`: Usar cliente aislado para `signInWithPassword` y `refreshSession`, y traducir errores de credenciales.
3. `/backend/src/app.js`: Actualizar el middleware de autenticacion para envolver cada peticion en `runWithToken`, renovar el JWT con `X-Refresh-Token` si expiro, exponer cabeceras CORS y ajustar `errorHandler` (`401` vs `403`).
4. `/frontend/src/api/config.js`: Persistir automaticamente los tokens renovados desde las cabeceras de respuesta y evitar cierres de sesion forzados en errores que no sean de autenticacion.
5. `/backend/tests/integration/api.test.js`: Verificar que las pruebas de integracion pasen con el flujo de token por peticion.
