# Ampliación local de cocina de Pancho Villa

Esta ampliación vive en la rama local `feature/cocina-operaciones`, carpeta
`/ruta/local/Documents/Pancho Villa Cocina`. GitHub y la rama `main` no se han
modificado. La aplicación original usa el puerto 3004 y su base original; esta
copia usa el puerto 3005, la base `pancho_villa_cocina`, otro secreto y cookies
propias. No combinar todavía las dos bases ni enviar esta rama a GitHub.

## Revisión y plan aplicado

Se conservaron Next.js 16.3.6, React 19.3.0, Prisma 6.19.0, Auth.js, Zod,
Tailwind, Resend, el menú, cuentas y pedidos. No se instalaron dependencias nuevas.
Ya existían `/cocina`, pedidos con precios y extras históricos, historial de
estados, outbox de correo con reintentos y SaborMX con contexto de la cuenta.
El seguimiento antes dependía únicamente del identificador; ahora exige una
cuenta válida y comprueba que el pedido pertenece a ella. ADMIN/COCINA pueden
consultar el seguimiento, pero sus APIs privadas siguen separadas.

Archivos principales:

- `src/components/kitchen-board.tsx`, `src/app/kitchen.css`, `src/app/cocina/page.tsx`:
  comandas, estados por plato, turnos, reloj, avisos, reconexión y controles grandes.
- `src/app/api/kitchen/{orders,stream,shift}/route.ts`,
  `src/app/api/kitchen/items/[id]/route.ts`: permisos, snapshots SSE y acciones.
- `src/lib/kitchen-{orders,recipes,estimates,math,shifts,jobs,transaction,snapshot}.ts`:
  transacciones, capacidad por estación, reservas, consumo, turnos y alertas.
- `src/app/api/orders/route.ts`, `src/app/api/orders/[publicId]/route.ts`,
  `src/components/order-tracking.tsx`, `src/app/carrito/page.tsx`:
  snapshots de recetas/alérgenos, propiedad del pedido, cocina cerrada y reparto.
- `src/app/admin/inventario/page.tsx`, `src/app/admin/ventas/page.tsx`,
  `src/components/operations-admin.tsx`, `src/lib/operations-admin.ts`,
  `src/app/api/admin/{operations,sales}/route.ts`: recetas, existencias y caja.
- `src/lib/assistant-orders.ts`, `src/app/api/ai/chat/route.ts`,
  `src/lib/{customer-journey,journey-copy,outbox,admin-summary}.ts`:
  estimaciones reales, avisos persistentes, resúmenes y devoluciones.
- `src/components/kitchen-mariachi.tsx`: mariachi vectorial propio y puente Rive.
- `src/app/api/push/subscription/route.ts`, `public/pancho-push-sw.js`,
  `src/components/push-opt-in.tsx`: preparación para push, desactivada por defecto.
- `src/auth.ts`, `src/app/login/page.tsx`: cookies aisladas y acceso revocado.

Las migraciones `0004_kitchen_operations` y `0005_kitchen_alerts` son aditivas.
Añaden estaciones, recetas e ingredientes, reservas y movimientos auditables,
turnos y pausas, eventos y acciones idempotentes, entradas de pago, cotizaciones y
referencias de reparto y suscripciones push. Añaden campos históricos y tiempos
a pedidos y artículos. Las restricciones de PostgreSQL impiden reservas negativas,
reservas superiores a existencias, recetas ambiguas y devoluciones excesivas.
Solo se aplicaron a la base independiente. No reconstruyen ni borran pedidos.

## Comportamiento y límites

1. Solo ADMIN/COCINA acceden a cocina; inventario administrativo, costes, ventas
   y cierres con importes son solo ADMIN. Se comprueba la cuenta activa y su
   versión de sesión en el servidor. SSE revalida rol/actividad/versión durante
   la conexión. El acceso se basa en cuentas; no limita una computadora física.
2. Las modalidades existentes son recogida y domicilio. No se añadió servicio
   de mesa ni se inventaron mesas, cursos o intervalos de un sistema inexistente.
3. `NUEVO → CONFIRMADO → EN_PREPARACION → LISTO` conserva los estados existentes.
   Recogida: `LISTO → ENTREGADO`. Domicilio: `LISTO → EN_CAMINO → ENTREGADO`.
   Cancelación solo desde NUEVO/CONFIRMADO; no se amplió a comida preparada.
   ADMIN registra merma de comida preparada, sin restituir ingredientes.
4. Al aceptar se reservan los ingredientes; al comenzar la preparación del pedido
   se consumen las reservas una vez. Cada plato tiene inicio/final real y responsable.
   El personal inicia cada plato y confirma que está listo. Solo cuando todos sus
   platos estén listos se confirma el pedido completo. El temporizador nunca lo hace.
5. Las recetas de plato y de cada extra deben configurarse. Ingredientes en `g`,
   `ml` o unidades; se admiten conversiones kg→g y l→ml, pero no masa→volumen ni
   fracciones de unidades. El coste de compra se expresa por **unidad base**.
6. Una receta incompleta se señala explícitamente. Los pedidos heredados conservan
   sus artículos, pero no se reconstruyen retrospectivamente los alérgenos, recetas
   ni costes que no se guardaron en su día. No se presentan como costes completos.
7. Las nuevas comandas congelan ingredientes, cantidades, costes de referencia,
   estación, tiempos y alérgenos del menú al confirmar. Cambiar después el catálogo
   no reescribe esos datos. La disponibilidad del menú considera existencias libres,
   y ADMIN puede marcar un plato agotado manualmente.
8. Las estimaciones usan intervalos y slots por estación, cantidad y FIFO de
   comandas, con trabajo iniciado prioritario y estaciones independientes en paralelo.
   Sin receta/capacidad muestran “Tiempo pendiente de confirmar”. Los tiempos reales
   quedan guardados; ADMIN ve referencias por plato y cantidad para ajustar recetas.
   No se sobrescriben automáticamente los tiempos configurados con pocas muestras.
9. El domicilio se despacha como pedido completo. La llegada previa suma final de
   preparación + espera de despacho configurada + recorrido. Después de salir,
   usa solamente salida + viaje. No usa minutos ficticios por kilómetro.
10. SSE envía el estado completo cada cinco segundos. Si falla, las consultas de
    siete segundos recuperan los pedidos actuales; reconexión y foco vuelven a
    consultar. Offline muestra aviso y desactiva acciones. No se descartan comandas
    activas por una paginación arbitraria. Historial visible: últimas 24 horas.
11. Apertura, pausa y cierre cierran/abren la recepción en PostgreSQL, comprobada
    también al comprar. Cerrar conserva comandas pendientes para terminarlas.
    El primer turno activa el modo de operación por turnos; antes se conserva la
    configuración heredada de recepción.
12. Pagos manuales: solo ADMIN registra un cobro realmente recibido y su método.
    Se separan pagos pendientes, cobros y devoluciones parciales/completas; historial
    de importes y coste de ingredientes. Margen sobre ingredientes no es beneficio
    neto; las devoluciones se restan de forma conservadora. El cierre calcula efectivo
    esperado/contado y diferencias, preparación media, retrasos y carga por estación.
    Un cierre sin efectivo contado deja esa diferencia pendiente, no cero.
13. Los informes se filtran por fecha de creación del pedido (cohorte de pedidos),
    incluyen devoluciones posteriores de esos pedidos y separan monedas. Máximo 500
    filas, con aviso explícito si se supera. No son un libro de caja por fecha de cobro;
    las entradas de pago conservan esa fecha y el cierre sí usa sus movimientos.
14. SaborMX recibe exclusivamente los pedidos de su cuenta y las mismas estimaciones.
    No obtiene recetas internas, stock, costes ni ventas. Sus respuestas de estado y
    tiempo usan datos deterministas. No dispone de herramientas para cambiar pedidos,
    cocina, inventario ni pagos.
15. Mariachi: dibujo SVG propio (autorizado como parte de este proyecto), reposo,
    nueva comanda, celebración breve, retraso y cocina cerrada. Movimiento reducido
    y desactivación respetados. Sonido de aviso optativo, solo con la pantalla abierta.
    Los eventos persistentes y los IDs guardados por cuenta evitan repetir avisos
    tras refrescar/reconectar.

## Recursos y servicios pendientes

### Rive

Hace falta un `.riv` propio o con permiso de uso **sin audio integrado**, un runtime
Canvas compatible y su WASM local, por ejemplo:

- `public/animations/mariachi.riv`
- `public/vendor/rive.js` y `public/vendor/rive.wasm`, procedentes de una misma versión
  del [runtime oficial de Rive](https://github.com/rive-app/rive-wasm).
- Máquina de estados `Kitchen`, entrada numérica `state`: 0 reposo, 1 nueva comanda,
  2 listo, 3 retraso, 4 cerrada.
- Configurar `NEXT_PUBLIC_MARIACHI_RIVE=/animations/mariachi.riv` y las rutas de
  runtime/WASM de `config.example.txt`. Reiniciar la copia. Sin ellos se usa el SVG propio.

El puente está preparado; no se ha probado con un archivo Rive real porque no existe
uno en el proyecto. El coste del diseño/licencia del recurso queda pendiente de elegir
un recurso autorizado. No se ha contratado ni descargado arte de terceros.

### Reparto

Falta confirmar latitud/longitud del restaurante y elegir/probar el servicio de
geocodificación y ruta en calles. Configuración ADMIN en Inventario; el adaptador
HTTPS usa `DELIVERY_ROUTING_ENDPOINT` y `DELIVERY_ROUTING_KEY`. Está sin configurar.
No se contrató ni se llamó a un servicio de pago.

Contrato del adaptador: POST con `origin` (latitud/longitud), `address` (solo calle,
ciudad, código postal y país) y `preferredMode: motorcycle`. Respuesta validada:
`latitude`, `longitude`, `routeMeters`, `minSeconds`, `maxSeconds`, `method`,
`mode` (`motorcycle` o `driving`) y `matchedAddress`. Los límites de duración deben
provenir del proveedor o de observaciones, no de multiplicadores inventados. Si
solo ofrece una duración, devolver el mismo valor para ambos extremos, sin afirmar
un intervalo de confianza. La UI muestra dirección y método de transporte reales.

La distancia Haversine decide cobertura 0–7 km, en siete tramos. Se calculan por
separado distancia y duración por calles; la cotización caduca en 15 minutos, queda
vinculada a dirección y cuenta y solo puede usarse en un pedido. Fuera de 7 km se
rechaza antes de confirmar. Sin proveedor/dirección verificable, no se confirma
una entrega. Las referencias por tramo guardan fecha/método y muestran número de
muestras; entregas reales añaden otra referencia desde salida hasta entrega.

Como opción a evaluar, las tarifas globales publicadas de Google (consulta
01/10/2026) muestran Compute Routes Essentials: 10.000 eventos mensuales gratuitos,
5 USD/1.000 en el primer tramo de pago; Geocoding: 10.000 gratuitos, 5 USD/1.000;
Compute Routes Enterprise: 1.000 gratuitos, 15 USD/1.000. Son SKUs y cuotas distintas;
no incluyen desarrollo del adaptador, impuestos ni otras funciones. Confirmar el SKU
real y presupuesto antes de activar. [Tarifas oficiales](https://developers.google.com/maps/billing-and-pricing/pricing).

Google limita `TWO_WHEELER` a regiones específicas; Alemania no aparece en la lista
consultada. Si el restaurante sigue en Berlín, **no afirmar que Google calcula una
ruta de moto**: evaluar otro proveedor o presentar una referencia de coche como tal.
[Regiones oficiales](https://developers.google.com/maps/documentation/routes/coverage-two-wheeled).

### Correo, cron, push y contabilidad

- Resend y OpenAI conservan sus integraciones; en esta copia las claves de envío/IA
  están vacías para evitar mensajes reales y consumo durante pruebas. SaborMX sigue
  consultando estados sin IA externa. Falta probar proveedores con credenciales de
  prueba aprobadas y dominio de correo validado.
- `/api/cron/kitchen` requiere `CRON_SECRET`; recalcula cada minuto, crea una alerta
  de retraso por pedido y un resumen por turno. `ADMIN_REPORT_EMAIL` habilita su correo
  por el outbox existente. `npm run kitchen:scheduler` permite hacerlo localmente,
  sin enviar correos; el planificador local independiente está iniciado en esta sesión.
  `vercel.json` prepara la ruta cron, pero no se publicó ni se configuró alojamiento.
  Tras reiniciar el Mac se deben iniciar la copia y su planificador otra vez.
- Push: service worker, opt-in y suscripciones preparados, sin activar. Faltan clave
  VAPID, emisor que consume eventos deduplicados, política de entrega/reintentos,
  eliminación de endpoints caducados y probar navegadores/HTTPS. Solo entonces fijar
  `PUSH_DELIVERY_ENABLED=true` y `NEXT_PUBLIC_PUSH_VAPID_KEY`. No se promete audio
  personalizado automático con la web cerrada.
- Falta una pasarela/verificación de pagos para cobros electrónicos automáticos.
  Registrar tarjeta manualmente significa que un empleado confirmó un cobro externo.
- Antes de usarlo como contabilidad fiscal se necesitan requisitos de la jurisdicción
  del restaurante, facturación y numeración legal, conservación/exportación de libros,
  conciliación bancaria/pasarela, reglas de impuestos y revisión profesional local.
  Este módulo es control operativo; no acredita cumplimiento fiscal.

## Guía para probarlo

1. Abre `http://localhost:3005/login` y usa tu cuenta ADMIN existente en la copia.
   Sus credenciales se conservaron, pero debes iniciar sesión de nuevo por el aislamiento.
2. En `/admin/inventario`, crea una estación con capacidad 2, un ingrediente con
   unidad base y mínimo; registra una entrada con cantidad y coste por unidad base.
3. Configura la receta de un plato **existente** del menú y de cada extra que vayas
   a utilizar. Pon tiempos mínimo/máximo y cantidades reales. No utilices cifras
   de ejemplo como recetas reales del restaurante.
4. En `/admin/ventas`, abre un turno con el efectivo inicial. En otra ventana o
   perfil del navegador, entra como CLIENTE y confirma un pedido de recogida del
   plato configurado en `/menu` y `/carrito`.
5. En `/cocina`, comprueba número, artículos, extras, instrucciones y alérgenos.
   Acepta: sube la reserva. Comienza el pedido: baja el stock y se consumen reservas.
   Inicia cada plato y confirma “Plato listo”; confirma el pedido listo y entregado.
6. Como cliente, abre el seguimiento y pregunta a SaborMX por ese pedido. Las dos
   pantallas deben mostrar el mismo estado y los tiempos reales disponibles. Prueba
   acceder a `/cocina`, `/admin/ventas` o sus APIs: deben bloquearte.
7. Crea dos pedidos que requieran el mismo último ingrediente. Al aceptarlos, solo
   uno puede reservarlo. Cancela antes de preparar: libera la reserva. Después de
   empezar, cancelar se bloquea; registra la merma desde ADMIN sin reponer stock.
8. Prueba dos platos en una estación con capacidad 2: pueden acabar en paralelo.
   Cambia capacidad a 1 y observa la cola. Sin receta debe indicar tiempo pendiente.
   Modifica el precio/alérgenos del catálogo después de pedir: la comanda conserva
   su snapshot histórico. Los pedidos heredados indican lo que no se registró.
9. Desconecta la red y reconecta. Verás el aviso; al volver se recupera la comanda
   sin consumir ni avisar otra vez. Desactiva animaciones; prueba movimiento reducido.
   Activa sonido por separado con la pantalla abierta.
10. Registra un cobro real en `/admin/ventas`, comprueba que deja de estar pendiente;
    registra una devolución parcial y completa. Prueba pausa/reanudación y cierre
    con efectivo contado. Se cierran nuevas compras y permanecen las pendientes.
11. Para reparto real, configura primero origen y proveedor aprobado. Comprueba una
    dirección dentro y otra fuera de 7 km; revisa dirección reconocida, ruta y modo.
    Tras despachar, la llegada debe calcularse desde salida, sin sumar preparación.
    Hasta configurar el proveedor, el bloqueo de entrega es el resultado esperado.

## Verificación técnica

Comandos desde esta carpeta, siempre con `DATABASE_URL` de la copia:

```sh
npm run typecheck
npm run lint
npm test
RUN_KITCHEN_DB_TESTS=1 npx vitest run tests/kitchen-integration.test.ts
npm run test:kitchen
npm run build
```

Las pruebas PostgreSQL y navegador se niegan a ejecutarse sobre otra base.
Crean y eliminan solamente sus fixtures temporales. El correo y la IA externos
no se invocan. Las pruebas de ruta usan respuestas sintéticas marcadas TEST,
no afirman haber comprobado rutas reales.

Resultado final de esta sesión: TypeScript y lint sin errores; 48 pruebas unitarias,
6 pruebas de PostgreSQL independiente y el recorrido Playwright completo aprobados.
Compilación de producción aprobada. Las pruebas comprobaron revocación de permisos
en conexiones abiertas, reconexión offline, móvil/tablet, recogida y despacho de
domicilio (este último con cotización sintética de prueba), además de reservas,
consumo, pagos y turnos. Proveedores externos y archivo Rive real siguen pendientes.
