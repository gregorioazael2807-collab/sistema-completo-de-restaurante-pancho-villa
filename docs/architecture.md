# Arquitectura de Pancho Villa

Pancho Villa es una aplicación independiente sobre Next.js App Router. Las páginas públicas presentan el menú y el flujo de compra; Route Handlers REST validan entradas con Zod y autentican/autorizan en el servidor con Auth.js. PostgreSQL vía Prisma es la fuente de verdad para catálogo, precios, pedidos, historial, pagos, métricas y automatizaciones.

## Límites de confianza

- El navegador nunca decide el precio final: el servidor vuelve a cargar precios, extras, impuestos y tarifas desde PostgreSQL dentro de una transacción serializable.
- COCINA y ADMIN acceden al KDS; solo ADMIN puede cambiar productos, ver métricas administrativas o gestionar el outbox. CLIENTE solo consulta sus propios pedidos; el seguimiento público por identificador aleatorio expone estado y artículos sin datos personales.
- El asistente consulta catálogo y pedidos autorizados. Solo propone cambios/carrito; no confirma pedidos, cancela ni cobra. Las alergias reciben una advertencia basada en los datos registrados y la instrucción de confirmar con el restaurante.
- No se almacena información de tarjeta. Los pedidos nuevos quedan con pago `PAYMENT_PENDING` hasta integrar un proveedor.
- Un alta siempre crea CLIENTE. Las tareas administrativas de correo requieren rol ADMIN también en la API.

## Pedido, idempotencia y notificaciones

Una transacción crea Order, OrderItem, historial inicial, Payment y trabajos de notificación, además de CustomerNotice cuando el pedido tiene una cuenta vinculada. Una clave idempotente evita duplicar el pedido. AutomationJob/Notification implementan el outbox y deduplicación; el worker procesa con reintentos y Resend puede rechazar envíos sin deshacer pedidos ya guardados. El KDS actualiza estados en PostgreSQL, guarda avisos del cliente en la misma transacción y consulta cambios periódicamente.

## Migraciones y datos demo

`prisma/migrations/0001_initial` contiene el esquema base versionado; `0002_postgres_order_features` incorpora las entidades de recuperación/rate-limit y las ampliaciones posteriores. `0003_customer_journey` añade conversaciones y avisos persistentes por cuenta. No modificar migraciones ya publicadas: crear una migración siguiente. `npm run db:seed` carga siete categorías, 21 productos localizados y dos grupos de opciones.

Las imágenes demo son assets locales optimizados en `public/menu/`, generados para este proyecto y documentados en `public/menu/README.md`; no se descargan de URLs remotas al ejecutar la app.

## Estado de entrega

- Disponible y verificado: portada/menú multilingüe, registro/login/recuperación, carrito/checkout, pedido/seguimiento, cocina, panel ADMIN con métricas, gestión del catálogo, categorías, extras y fotografías, automatizaciones/outbox e interfaz del asistente.
- Faltan para producción: proveedor de pagos, credenciales y dominio verificado de Resend, proveedor/API key de IA, política operativa real para entregas e integración de recordatorios con horarios futuros. También falta ampliar empleados/horarios y completar la batería de responsive/end-to-end para todos los roles y tamaños.
- El KDS usa polling cada siete segundos; todavía no usa WebSockets ni push.

## Recorrido del cliente

`JourneyProvider` comparte conversación y avisos entre la página del asistente
y un panel flotante en las pantallas del cliente. `/api/ai/journey` exige sesión
y limita tanto lectura como marcado de avisos al usuario autenticado.
PostgreSQL conserva los mensajes y los estados de lectura entre dispositivos.
Se actualiza cada siete segundos con la pestaña visible y al volver a enfocarla.
Las respuestas atrasadas y los datos de una sesión cerrada se descartan.

Cada consulta del modelo carga el catálogo y los pedidos propios actuales,
junto con el carrito sin confirmar y los últimos 20 mensajes. La pantalla muestra
los últimos 50 mensajes. Los avisos tienen fecha y representan eventos históricos;
el estado actual se consulta de nuevo. No se envían avisos push con la app cerrada.

## Variables externas

Solo `config.example.txt` se incluye en Git. Se necesita PostgreSQL y `AUTH_SECRET` para la app. Para correo: `RESEND_API_KEY`, `EMAIL_FROM` y dominio validado. Para IA: `AI_API_KEY`, `AI_BASE_URL` y `AI_MODEL`. El worker cron de Vercel requiere `CRON_SECRET`. Los pagos permanecen pendientes hasta configurar un proveedor; no se capturan PAN ni CVV.

## Catálogo administrativo ampliado

`/admin/productos` mantiene platos, categorías, grupos de opciones y extras,
incluidas traducciones ES/EN/DE, asignaciones de grupos e imágenes.
`/api/admin/catalog` requiere ADMIN para lectura, creación, actualización y
retirada. Retirar desactiva el elemento; no borra referencias de pedidos.
Los precios históricos siguen en las líneas del pedido.
Categorías y grupos desactivados se excluyen también al validar checkout.

Las fotografías se suben mediante `/api/admin/catalog/photos`: máximo 5 MB,
JPEG/PNG/WebP comprobado por decodificación, límite de 25 millones de píxeles,
conversión a WebP de hasta 1600 px y nombre aleatorio. Los archivos se guardan
en `.data/catalog-photos` y se sirven por una ruta pública con nombre validado.
Esta carpeta debe incluirse en copias de seguridad. El almacenamiento funciona
en este Mac o un servidor con disco persistente; un despliegue con filesystem
efímero necesita adaptar este módulo a almacenamiento de objetos antes de usar
subidas en producción. Retirar o cambiar una foto no elimina el archivo original.
