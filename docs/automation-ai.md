# Automatizaciones y agente de Pancho Villa

## Implementación actual

PostgreSQL es la fuente de verdad. Crear un pedido o cambiar su estado guarda
el cambio, el historial y los trabajos de notificación en una transacción.
El outbox existente reclama trabajos, reintenta hasta cinco veces y utiliza
claves de deduplicación para Resend. Fallar el correo no deshace un pedido.

El contexto del asistente se centraliza en `src/lib/assistant-orders.ts`.
Siempre filtra por el usuario autenticado; incluye los últimos 30 pedidos,
artículos, extras, instrucciones, notas, importes, pago e historial.
No expone dirección, teléfono ni correo al proveedor de IA.
El pedido seleccionado se valida contra esa consulta; no permite consultar
pedidos de otra cuenta. Las consultas de estado tienen respuesta determinista
y no necesitan proveedor de IA.

La conversación se guarda por cuenta en `AssistantMessage`. La página del
asistente y el panel flotante comparten los últimos 50 mensajes; el modelo recibe
los últimos 20 y un contexto nuevo de catálogo, carrito y pedidos en cada consulta.
Cada intercambio tiene una clave de solicitud para evitar duplicados al reintentar.
Los mensajes antiguos no sustituyen el estado actual del pedido. El historial y
los avisos no se guardan en localStorage; cerrar sesión limpia la vista compartida.

Crear un pedido autenticado o cambiar su estado guarda también `CustomerNotice`
en la misma transacción. Los avisos llevan fecha, estado del evento y lectura
persistente. La migración crea un aviso inicial para pedidos activos existentes.
Se consultan los últimos 50 avisos y el total de no leídos de la cuenta.

El proveedor compartido consulta cada siete segundos mientras la pestaña está
visible y al recuperar el foco o cambiar de pantalla. El panel SaborMX y el aviso
del último evento no leído aparecen en menú, carrito, cuenta y seguimiento.
Las pantallas administrativas y de acceso no muestran el panel. Una consulta
fallida conserva los datos anteriores y muestra un error. Los avisos operativos
no necesitan IA ni dependen de la entrega del correo. Sin configurar el proveedor,
el asistente puede consultar estados reales y dar una orientación básica.

Este recorrido requiere una cuenta autenticada. Los avisos se recuperan también
en otro dispositivo al iniciar sesión, pero no son notificaciones del sistema:
con la app cerrada no se reciben avisos push.

## Arquitectura objetivo pendiente

1. Extender los eventos persistentes actuales con versionado y nuevos tipos,
   por ejemplo pago confirmado o recordatorio programado.
2. Entregas independientes por canal: bandeja interna, SSE y correo.
   Cada canal lleva clave evento/canal, intentos, bloqueo con vencimiento
   y estado final propio. No confundir aceptación del correo con entrega.
3. SSE autenticado con cursor de reconexión y recuperación desde PostgreSQL.
   Revalidar permisos durante conexiones largas y caducar accesos revocados.
4. Para invitados, token firmado y limitado a un pedido, con expiración.
   Un número de pedido no autoriza acceso a datos personales.
5. Herramientas de IA de solo lectura: menú, pedido propio y política operativa.
   Validar argumentos y permisos en servidor. No aceptar un userId del modelo.
   Notas del cliente y descripciones son datos, nunca instrucciones del agente.
6. Añadir resúmenes para conversaciones extensas y una política de retención
   y eliminación. El límite de historial enviado ya está implementado.
7. Añadir presupuestos de coste, límites explícitos de tokens y métricas de
   herramientas. Ya existen límites de solicitudes, tiempo y longitud de la
   respuesta, y auditoría de consultas.
8. Añadir web push y consentimiento para avisos fuera del navegador.

Los recordatorios requieren primero una hora futura real. El evento de pago
requiere integración y verificación de firma del proveedor. No generar avisos
de cobro ni promesas de entrega basándose en texto del modelo.

## Validación antes de publicar

- Probar contexto y selección con dos cuentas independientes.
- Probar aviso inicial, cambio de estado, estado terminal y petición fallida.
- Probar workers concurrentes, recuperación de bloqueo y deduplicación.
- Probar desconexión/reconexión y revocación de sesión cuando se añada SSE.
- Evaluar preguntas ambiguas, múltiples pedidos e instrucciones maliciosas
  dentro de notas. Confirmar que la IA nunca cobra ni modifica pedidos.
- Verificar correo y proveedor IA en entorno de prueba; no disparar el worker
  contra destinatarios reales durante pruebas automáticas.

Referencia para las herramientas propuestas:
https://developers.openai.com/api/docs/guides/function-calling

Referencia para el historial de conversación enviado al modelo:
https://developers.openai.com/api/docs/guides/conversation-state
