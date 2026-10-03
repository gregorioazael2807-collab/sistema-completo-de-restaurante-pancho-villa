# Sesiones independientes de cliente y cocina

Implementado en la rama local `feature/integracion-web-cocina` de la copia, sin modificar la web original.

## Separación

- Cliente: src/auth.ts, /api/auth, cookies namespace customer, proveedor credentials, rol CLIENTE.
- Cocina: src/kitchen-auth.ts, /api/kitchen-auth, cookies namespace kitchen, proveedor kitchen-owner, cuenta vinculada ADMIN.
- Cookies de sesión, CSRF y callback con nombres distintos; CSRF/callback no comienzan por el nombre de la cookie de sesión para evitar que se interpreten como fragmentos JWT.
- JWT contiene authScope; sesiones antiguas compartidas se invalidan.
- getActor acepta scope explícito. requireCurrentUser usa customer por defecto y kitchen en páginas administrativas.
- requireRole usa customer cuando sus permisos incluyen CLIENTE y kitchen para operaciones administrativas. No elige una sesión según las cookies presentes.
- Login/logout de cocina usa sus propias Server Actions. Salir de cliente no elimina cocina y viceversa.
- Se revalida actividad/rol/versión de sesión y propietario/restaurante activo; SSE revalida el propietario en cada heartbeat.

Los pedidos comparten la base de pruebas, no las credenciales. Registrar propietario no otorga acceso sin activación privada. Se mantiene una instalación por restaurante, no SaaS multitenant.

## Verificación ejecutada

- TypeScript y lint completos aprobados.
- 66 pruebas unitarias aprobadas; 6 pruebas de integración de DB omitidas por su flag opt-in.
- Playwright session-isolation.spec.ts aprobado: login real de propietario y cliente en el mismo contexto de navegador, cookies distintas, ausencia de Administración para cliente, bloqueo de API privada sin sesión de cocina, logout independiente en ambos sentidos.
- Fixtures temporales eliminados. No usa correos ni IA externos.

Comando:

```sh
npx playwright test --config playwright.kitchen.config.ts session-isolation.spec.ts
```

Pendiente: adaptar el test legado kitchen-operations.spec.ts, que inyecta tokens del diseño de sesión antiguo y presupone acceso del rol COCINA. No se ha ejecutado ni se afirma aprobado en esta fase. La prueba completa de pedidos/cierre y despliegue en producción siguen pendientes.

## Prueba manual

En el mismo navegador, sin ventana privada:

1. Entrar como propietario en http://localhost:3005/cocina/login.
2. En otra pestaña entrar como cliente en http://localhost:3005/login.
3. Abrir /cocina y /cuenta: ambas conservan su cuenta correcta.
4. Salir de cocina: /cuenta sigue conectado.
5. Entrar de nuevo a cocina y salir de cliente: cocina sigue conectado.

Hay que iniciar sesión de nuevo después de instalar este cambio.
