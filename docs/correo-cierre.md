# Correo automático del cierre

Al cerrar un turno desde cocina o administración, la misma transacción guarda:

- Ventas entregadas del día local hasta el cierre, precios históricos, extras, descuentos, impuestos y reparto, separados por moneda.
- Compras de ingredientes registradas como PURCHASE en ese mismo día, con cantidades y costes históricos. ENTRY no se trata como una compra.
- Coste conocido de ingredientes de las ventas en la moneda del restaurante, con recuento de comandas de coste incompleto.
- Instantánea de existencias, reservas, disponibilidad y stock bajo.
- Trabajo KITCHEN_SUMMARY con dedupeKey shift-summary:<id-turno>.

Destinatario: correo del propietario activo que cierra el turno; ADMIN_REPORT_EMAIL se utiliza solo como alternativa si no hay propietario vinculado. No se aceptan destinatarios enviados por el cliente.

Después de responder, Next.js after intenta procesar exclusivamente ese informe. La cola conserva los fallos para reintentos; el procesador existente /api/cron/outbox debe estar programado para reintentar sin intervención tras fallos temporales. Resend recibe la misma clave de idempotencia. Los controles de reclamación de trabajos evitan procesamiento concurrente normal.

La pantalla del último cierre muestra pendiente, error o COMPLETED. COMPLETED indica aceptación del proveedor, NO recepción garantizada en bandeja de entrada.

El correo requiere RESEND_API_KEY y EMAIL_FROM configurados, remitente autorizado y proveedor operativo. Se verificó presencia de las variables de la original; no se realizó un envío externo de prueba. Las pruebas de transporte usan mocks.

Los resúmenes son acumulados diarios al momento del cierre: no sumar dos cierres del mismo día. El informe no confirma cobros, efectivo físico, beneficio neto ni cumplimiento fiscal. Compras y consumo no se suman como un solo gasto. Costes ausentes quedan pendientes y no se reconstruyen con costes actuales. No incluye salarios, alquiler ni gastos ajenos al inventario.

Verificación: TypeScript, lint y 74 pruebas unitarias aprobados. Pendiente prueba manual cerrando un turno real autorizado y confirmando recepción.
