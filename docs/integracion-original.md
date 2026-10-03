# Web original con cocina integrada

Integración local realizada el 3 de octubre de 2026 en la rama `feature/web-original-con-cocina`.

## Versión principal local

Carpeta: `/ruta/local/Documents/Pancho Villa`.
Base: `pancho_villa`, la original; no se sustituyó por la base de pruebas.

- Web/menú con configuración de IA existente: http://localhost:3004/menu
- Acceso cliente: http://localhost:3004/login
- Acceso propietario: http://localhost:3004/cocina/login
- Comandas: http://localhost:3004/cocina

Cookies independientes de cliente y cocina. Se requiere iniciar sesión otra vez. El proveedor público de cliente acepta CLIENTE; la cocina autentica propietarios activados. Los administradores heredados deben disponer de cuenta de propietario activada para la cocina; no se convierten automáticamente desde registro público.

## Conservación y cambios

Se hizo respaldo PostgreSQL completo privado antes de aplicar las migraciones aditivas 0004–0007. Los conteos de pedidos y productos originales se conservaron. Se añadió una identidad ADMIN interna sin contraseña pública para el propietario elegido y se importó únicamente su cuenta de propietario y hash desde la copia. No se copiaron pedidos ni clientes de pruebas. Las credenciales de IA originales permanecen en .env, fuera de GitHub.

El endpoint privado de cocina se comprobó contra la base original y se verificó que incluye todos sus pedidos activos. Web respondió HTTP 200. TypeScript, lint y 66 pruebas unitarias aprobadas. No se realizó una llamada externa a IA ni se enviaron correos en esta comprobación.

## Pendiente antes de eliminar copias

- Prueba manual con el propietario y un cliente en el mismo navegador del puerto 3004.
- Pedido de recogida desde la web original → comanda → preparación → entrega → seguimiento → cierre de ventas.
- Configurar recetas, extras, existencias y capacidades reales: no importar recetas o inventarios ficticios.
- Probar respuesta de IA con aprobación de consumo y correo externo con dominio válido.
- Adaptar prueba heredada de navegador a las nuevas sesiones; pruebas automáticas con fixtures siguen bloqueadas en la base original por seguridad.
- Confirmar funcionamiento antes de borrar carpetas duplicadas. Conservar respaldos y repositorios.

Esta integración todavía no se ha desplegado públicamente. Guardar una rama en GitHub no configura el alojamiento, variables ni base del sitio publicado. No afirmar que se actualizó la web remota.
