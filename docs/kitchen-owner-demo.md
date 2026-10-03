# Propietario y prueba web → cocina

## Alcance

La copia usa `pancho_villa_cocina`, separada de la web original. Esta fase implementa una instalación dedicada para un restaurante, NO un SaaS multitenant. No se deben activar varios propietarios sobre la misma base. El registro crea KitchenOwner y KitchenRestaurant; no concede acceso a los pedidos existentes.

## Activación privada

Desde `/ruta/local/Documents/Pancho Villa Cocina`:

```sh
npx tsx scripts/activate-kitchen-owner.ts correo-del-propietario
```

Solo acepta la base de pruebas. Debe ejecutarlo el responsable local para la cuenta elegida. Bloquea otro propietario cuando ya hay uno activado. Crea una identidad ADMIN interna sin contraseña de cliente; el propietario entra exclusivamente con `kitchen-owner`, usando su propio hash. No cambia el rol de ninguna cuenta de cliente.

El correo del propietario puede coincidir con un correo en User: están en tablas diferentes. La autenticación de cliente sigue usando `credentials` y sus propias contraseñas.

## Prueba manual pendiente

1. Registrar propietario en `http://localhost:3005/cocina/registro`.
2. Activar explícitamente la cuenta elegida mediante el comando local.
3. Iniciar sesión en `http://localhost:3005/cocina/login` con el correo y contraseña del propietario.
4. Revisar recetas, stock, recepción y turno en la copia, antes de crear pedidos. No inventar recetas ni cantidades reales.
5. En otro perfil o ventana privada entrar como CLIENTE en `http://localhost:3005/menu` (no puerto 3004).
6. Crear un pedido de recogida en la web de pruebas.
7. Ver su comanda, aceptar, iniciar preparación, iniciar y completar platos, marcar listo y entregar.
8. Revisar el seguimiento del cliente y comprobar que refleja los estados.

La prueba manual completa necesita la cuenta elegida y la configuración real de recetas/inventario; no se afirma que se haya ejecutado.

## Recuperación

La solicitud con scope kitchen busca KitchenOwner, no el correo de cliente. El token pertenece a su identidad interna y la finalización cambia el hash del propietario e invalida la sesión interna. Enlaces de 30 minutos y un solo uso. Correo requiere Resend, remitente aprobado y procesador de outbox. No se ha probado entrega externa ni se han activado credenciales de pago.

## Pendiente antes de vender como servicio compartido

Aislar por restaurante catálogo, pedidos, inventario, turnos, informes, jobs y notificaciones, y probar accesos cruzados. En esta fase la separación operativa se hace mediante una base e instalación independientes, no mediante filtros de tenant. No exponer este prototipo como SaaS público.
