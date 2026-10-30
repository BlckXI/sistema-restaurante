# Sistema de Gestión y Punto de Venta — Restaurante D' La Casa

Aplicación web full-stack para la operación integral en tiempo real de **Restaurante D' La Casa**: toma de pedidos en Caja, pantalla de comandas en Cocina (KDS), panel de entregas a domicilio para Repartidor, control de inventario con soporte de porciones vinculadas (`id_padre`) y reportes financieros con cierre de caja y exportación a PDF.

---

## Arquitectura del Proyecto

```text
/
├── backend/
│   ├── index.js                      # Servidor HTTP + Socket.IO (polling + websocket)
│   └── src/
│       ├── app.js                    # Configuración de Express, CORS y rutas
│       ├── config/
│       │   ├── constants.js          # Constantes de negocio compartidas (COSTO_DOMICILIO)
│       │   ├── supabase.js           # Cliente Supabase (DB + verificación Auth con caché TTL)
│       │   └── supabase.mock.js      # Almacén en memoria para desarrollo local y tests
│       ├── middlewares/
│       │   ├── auth.js               # Verificación de JWT con Supabase Auth y renovación automática
│       │   ├── roles.js              # Control de acceso por roles (requireRole)
│       │   └── errorHandler.js       # Manejador centralizado de errores HTTP
│       ├── controllers/              # Controladores HTTP (auth, menu, order, report, delivery)
│       ├── services/                 # Lógica de negocio pura (orderService, financeService, menuService)
│       ├── routes/                   # Definición de endpoints REST
│       └── utils/                    # Validadores y utilidades de fechas (zona horaria Ecuador)
├── frontend/
│   └── src/
│       ├── api/                      # Cliente Axios con interceptores JWT, Socket.IO y servicios REST
│       ├── components/               # Vistas modulares (Reportes, Inventario, Modales)
│       ├── hooks/                    # Custom hooks (useCaja, useCocina, useInventario, useReportes)
│       └── utils/                    # Validadores de formularios del cliente
└── tests/
    └── financeService.test.js        # Suite de pruebas automatizadas (node:test)
```

---

## Flujo Operativo

1. **Caja (`/caja`)**:
   - Selecciona platos disponibles del inventario, modalidad de entrega (`mesa`, `llevar`, `domicilio`, `personal`) y método de pago (`efectivo` o `transferencia`).
   - El backend valida existencias, descuenta el stock real (o el del plato principal si el ítem tiene `id_padre`), calcula el total oficial con los precios de la base de datos y emite el evento `nueva_orden` vía Socket.IO.
2. **Cocina (`/cocina`)**:
   - Recibe las órdenes pendientes en tiempo real con alerta sonora.
   - Al despachar una orden (`PATCH /ordenes/:id/completar`), el estado pasa a `listo` y notifica a Caja y Repartidor.
3. **Repartidor (`/repartidor`)**:
   - Visualiza los pedidos a domicilio pendientes de entrega y su historial del día, permitiendo marcarlos como `entregado`.
4. **Inventario (`/inventario`)**:
   - Creación y edición de platos y categorías, vinculación de porciones secundarias a un plato principal (`id_padre`), puesta en `0` individual con opción de deshacer (Undo) y reinicio masivo protegido por confirmación.
5. **Reportes y Cierre de Caja (`/reportes`)**:
   - Cuadre diario automático desglosando saldo inicial, ventas en efectivo netas, domicilios, transferencias bancarias, ingresos extras y gastos operativos, con exportación a PDF.

---

## Variables de Entorno

### Backend (`backend/.env` o variables en Render)

| Variable | Descripción |
| :--- | :--- |
| `PORT` | Puerto del servidor HTTP (por defecto `3000`). |
| `SUPABASE_URL` | URL del proyecto en Supabase. |
| `SUPABASE_KEY` | Clave API (`service_role` o `anon` con políticas configuradas) para consultas en Supabase. |
| `CORS_ORIGIN` | Origen permitido para CORS y Socket.IO (por defecto `*`). |

### Frontend (`frontend/.env` o variables en Vercel)

| Variable | Descripción |
| :--- | :--- |
| `VITE_API_URL` | URL base del backend (ej. `https://api-restaurante-yawj.onrender.com`). Si se omite en desarrollo unificado, usa el mismo origen. |

---

## Instalación y Ejecución Local

```bash
# 1. Instalar dependencias en raíz, backend y frontend
npm install

# 2. Iniciar entorno de desarrollo (puerto 3000)
npm run dev

# 3. Ejecutar pruebas unitarias y de integración
npm test

# 4. Ejecutar linter en backend y frontend
npm run lint

# 5. Compilar el frontend para producción
npm run build
```
