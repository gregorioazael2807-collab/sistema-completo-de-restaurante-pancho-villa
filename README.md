# Pancho Villa

Aplicación full stack de restaurante mexicano: menú, venta online, pedidos, cocina/KDS, panel administrativo, IA y automatizaciones. Está desarrollada con Next.js, React, TypeScript, Tailwind, Auth.js, Zod, Prisma y PostgreSQL.

## Fase actual: arquitectura + diseño + base de datos

Se definieron el modelo relacional inicial y los límites de seguridad/fiabilidad. BookFlow permanece separado en `/ruta/local/bookflow`.

## Desarrollo local

1. Copia `config.example.txt` como `.env` y configura PostgreSQL.
2. Ejecuta `npm install`.
3. Ejecuta `npx prisma validate` y `npm run db:migrate`.
4. Ejecuta `npm run dev` y abre `http://localhost:3004`.

No introduzcas claves reales en Git. Los proveedores Resend, IA y pagos requieren configuración aparte; no se consideran activos por tener sus modelos preparados.

Consulta [docs/architecture.md](docs/architecture.md) para límites, flujo de pedido y fases.
