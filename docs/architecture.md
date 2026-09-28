# Arquitectura inicial

Pancho Villa será una aplicación única Next.js con App Router. Las páginas públicas sirven el menú y la experiencia de compra; los Route Handlers REST validan entradas con Zod y autorizan cada operación con Auth.js en servidor. Prisma/PostgreSQL será la fuente de verdad para menú, precios, disponibilidad, pedidos, estados, pagos y métricas.

## Límites de confianza

- El cliente nunca determina el precio final: el servidor vuelve a consultar precios, extras, impuestos y entrega en PostgreSQL.
- La cocina solo avanza comandas permitidas; ADMIN gestiona catálogo, ajustes y métricas; CLIENTE ve únicamente sus pedidos y el seguimiento público limitado usa un identificador no secuencial.
- La IA recibe el menú y métricas consultados desde la base. Propone productos y explica cifras, pero las acciones de pedido requieren una confirmación humana y validación normal del servidor.
- No se guardan datos de tarjeta. El estado del pago y cualquier referencia tokenizada del proveedor se separan del pedido.

## Flujo de pedido y fiabilidad

Una transacción crea Order, OrderItem, estado inicial, Payment y trabajos de notificación. La clave idempotente evita duplicar pedidos. Un trabajador reclama AutomationJob con bloqueo y reintenta fallos; las claves dedupe evitan duplicar correo/comandas. Un proveedor externo caído no revierte un pedido persistido.

## Esquema inicial

`prisma/schema.prisma` define usuarios y roles, catálogo localizado, modificadores, direcciones, pedido y snapshots de precio, historial, pago, notificación con deduplicación, cola de automatizaciones, auditoría IA y configuración del restaurante. Las fotografías son assets locales gestionados por el proyecto; nunca URLs aleatorias.

## Fases

1. Arquitectura, identidad y modelo relacional (actual).
2. Auth.js, alta, sesión y autorización por rol.
3. Menú PostgreSQL, traducciones, categorías e imágenes locales.
4. Carrito y cálculo seguro de extras/totales.
5. Checkout idempotente, pedido, pago pendiente y seguimiento.
6. KDS de cocina con transición de estados.
7. Administración e informes PostgreSQL.
8. Asistente conversacional con respuestas estructuradas y aprobación explícita.
9. Outbox/jobs, Resend y reintentos idempotentes.
10. Ajuste visual, fotografía y accesibilidad móvil.
11. Vitest + Playwright en flujos y permisos.
12. Variables, migraciones y lista de despliegue Vercel.

## Configuración externa

Solo `config.example.txt` se incluye en Git. Para ejecutar contra datos reales hacen falta PostgreSQL, `AUTH_SECRET`; para correo, `RESEND_API_KEY` y un remitente/dominio validado; para IA, la clave, URL compatible y nombre de modelo del proveedor elegido; y para cron, `CRON_SECRET`. Los pagos reales quedan desacoplados y requerirán credenciales del proveedor antes de activarse.
