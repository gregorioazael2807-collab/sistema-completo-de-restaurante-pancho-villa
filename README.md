# Sistema completo de restaurante Pancho Villa

> Integración local de la web original con cocina: consulta [docs/integracion-original.md](docs/integracion-original.md). Web y comandas comparten los pedidos originales en el puerto 3004, con sesiones independientes. No se ha publicado todavía esta integración.

Aplicación web de pedidos para un restaurante mexicano, creada como proyecto independiente; BookFlow no se modifica. Usa Next.js, React, TypeScript, Tailwind CSS, Auth.js, Zod, Prisma y PostgreSQL.

## Implementado y comprobado

- Portada mexicana responsive y catálogo público PostgreSQL con siete categorías, 21 productos, traducciones ES/EN/DE, fotos locales y opciones/extras.
- Registro de clientes, login Auth.js, contraseñas bcrypt, rate limits en PostgreSQL, roles ADMIN/COCINA/EMPLEADO/CLIENTE, recuperación de contraseña con enlace de un uso e invalidación de sesiones anteriores.
- Carrito local, recogida o entrega, validación de checkout Zod en servidor, precios/extras recalculados en transacción serializable, importes en céntimos, idempotencia, pago pendiente, outbox y seguimiento por identificador aleatorio.
- Cocina protegida por rol con cambios persistentes, historial y actualización periódica; dashboard ADMIN con métricas, gestión administrativa de platos, categorías, grupos de extras, opciones, traducciones y fotografías y vista de automatizaciones.
- Asistente cliente con conversación persistente por cuenta y contexto actualizado de menú, carrito y pedidos propios. Panel compartido y avisos persistentes en menú, carrito, cuenta y seguimiento, con actualización cada siete segundos. Solo propone productos, no ejecuta cargos/cancelaciones. El endpoint ADMIN de resumen obtiene métricas del backend y limita la interpretación de IA a esos datos.
- Correos de pedido, cambios de estado y recuperación mediante Resend/outbox con deduplicación, reintentos escalonados y reintento manual. `vercel.json` agenda el worker cada minuto.

## Inicio local

1. `npm install`
2. Copia `config.example.txt` a `.env` y configura `DATABASE_URL`, `AUTH_SECRET` y `NEXTAUTH_URL`.
3. `npx prisma validate`
4. `npm run db:migrate`
5. `npm run db:seed` (7 categorías, 21 productos y grupos de opciones)
6. Define `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME` y `ADMIN_LAST_NAME`; ejecuta `npm run db:bootstrap-admin` una vez y luego elimina esas variables del entorno.
7. `npm run dev` y abre `http://localhost:3004`.

El test E2E de flujo real crea clientes y pedidos; apúntalo solo a una base desechable de prueba. Se omite automáticamente si no están definidos `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Servicios externos y límites actuales

- **Correo:** configurar `RESEND_API_KEY`, un dominio verificado en Resend y `EMAIL_FROM` con remitente autorizado. La pantalla solo informa si las variables existen; eso no prueba que Resend acepte el dominio. Los pedidos sobreviven a fallos del correo y el worker reintenta hasta cinco veces.
- **IA:** configurar `AI_API_KEY`, `AI_BASE_URL` (por ejemplo, `https://api.openai.com/v1`) y `AI_MODEL`. Sin ellas, el asistente conserva consultas de estado y orientación básica, y explica que las recomendaciones de IA no están configuradas. Los avisos operativos funcionan independientemente del modelo.
- **PostgreSQL:** hace falta una instancia propia para persistencia local/de producción. El seed y la migración no se ejecutan automáticamente en Vercel.
- **Pagos:** solo se crean pagos `PAYMENT_PENDING`; no hay proveedor integrado ni se procesan tarjetas. El checkout nunca pide PAN/CVV.
- **Recordatorios previos al pedido:** pendientes; todavía no se puede elegir una hora futura de recogida/entrega. Cancelaciones de pedido desde el cliente, cupones/descuentos, gestión de empleados/horarios, control geográfico del reparto y sincronización en tiempo real por push también quedan fuera de esta entrega. KDS consulta cada siete segundos.
- **Estadísticas de ventas:** suman únicamente pagos marcados `PAID`. Como el proveedor de pagos no está integrado, los pedidos nuevos permanecen pendientes y no se cuentan como ventas cobradas.

## Comprobaciones

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx prisma validate` (requiere `DATABASE_URL`; basta una URL de PostgreSQL para validar el esquema)
- `npm run build`
- `npm run test:e2e` (ejecuta contra el build local; el caso con PostgreSQL requiere base desechable y credenciales ADMIN de prueba)

## Rutas locales

- `http://localhost:3004/` — portada
- `http://localhost:3004/menu` — catálogo
- `http://localhost:3004/carrito` — carrito y checkout
- `http://localhost:3004/login` y `/register` — acceso y registro
- `http://localhost:3004/cuenta` — pedidos y cuenta (autenticación requerida)
- `http://localhost:3004/asistente` — SaborMX (autenticación requerida)
- `http://localhost:3004/pedido/MX-...` — seguimiento de un pedido real
- `http://localhost:3004/cocina` — KDS (ADMIN/COCINA)
- `http://localhost:3004/admin` — dashboard (ADMIN)
- `http://localhost:3004/admin/productos` — catálogo, extras y fotografías (ADMIN)
- `http://localhost:3004/admin/automatizaciones` — outbox y estado del correo (ADMIN)

Consulta [docs/architecture.md](docs/architecture.md) para el diseño del esquema, seguridad y límites REST.

## Correos automáticos en este Mac

La tarea de macOS `com.panchovilla.outbox` ejecuta `scripts/process-local-outbox.mjs` cada 60 segundos y al iniciar sesión. Lee las credenciales de `.env` en cada ejecución y llama exclusivamente al endpoint local autenticado. Necesita que el Mac esté despierto, la sesión iniciada, PostgreSQL y Pancho Villa en el puerto 3004 estén funcionando, y haya conexión a Internet. No inicia esos servicios por sí misma.

- Configuración de la tarea: `~/Library/LaunchAgents/com.panchovilla.outbox.plist`.
- Registros sin claves ni contenido de mensajes: `~/Library/Logs/PanchoVilla/outbox.log` y `outbox-error.log`.
- Estado: `launchctl print gui/$(id -u)/com.panchovilla.outbox`.
- Desactivar: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.panchovilla.outbox.plist`.
- Reactivar: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.panchovilla.outbox.plist`.

Los envíos aceptados por Resend se marcan como completados; eso no confirma su entrega en la bandeja del destinatario. Los reintentos y la prevención de duplicados siguen a cargo de la cola existente. Los enlaces de los correos usan `NEXTAUTH_URL`; antes de usarlos con clientes externos debe configurarse la URL pública de la aplicación.

## Gestión del catálogo desde la app

En `/admin/productos`, ADMIN puede crear y editar platos, categorías, grupos de
extras y extras individuales. Permite asignar categorías y grupos a cada plato,
modificar precios, ingredientes y alérgenos, mantener traducciones ES/EN/DE y
seleccionar fotos existentes o subir JPG/PNG/WebP de hasta 5 MB. Retirar un
elemento lo desactiva sin borrar pedidos anteriores; se puede reactivar editándolo.
Las subidas se convierten a WebP y se guardan en `.data/catalog-photos`. Incluir
esta carpeta en backups. Antes de desplegar en un entorno con disco efímero,
conectar almacenamiento persistente para las fotos.

La prueba `RUN_CATALOG_WRITE_TESTS=1 npx playwright test tests/e2e/catalog-admin.spec.ts`
crea y elimina únicamente sus propios elementos temporales; no crea pedidos ni
envía correos. Requiere base local accesible, app activa y `AUTH_SECRET`.

## Conversación y avisos del cliente

La migración `0003_customer_journey` añade mensajes y avisos sin sustituir tablas
existentes. `/api/ai/journey` permite consultar y marcar como leídos solo los datos
de la cuenta autenticada. Los avisos quedan guardados aunque el cliente cambie de
pantalla o cierre la app; se muestran al volver. No hay web push con el navegador
cerrado. Consulta [docs/automation-ai.md](docs/automation-ai.md) para los límites.

La prueba `RUN_JOURNEY_WRITE_TESTS=1 npx playwright test tests/e2e/customer-journey.spec.ts`
comprueba persistencia, lectura, contexto actualizado y aislamiento entre cuentas.
Crea y elimina dos usuarios y un pedido temporales, sin trabajos de correo.

## Ampliación de cocina en copia independiente

Esta rama local amplía cocina, inventario, turnos y ventas. Consulta
[la guía de implementación, límites y pruebas](docs/kitchen-operations.md).
La copia se ejecuta con `npm run dev:kitchen` en el puerto 3005 y
`npm run kitchen:scheduler` para alertas periódicas; no se ha combinado con main ni subido a GitHub.
