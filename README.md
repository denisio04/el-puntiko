# EL PUNTIKO.

Tienda e-commerce para el mercado cubano con sistema de afiliados integrado.

## Tecnologías

- **Next.js 14.2** (App Router)
- **TypeScript**
- **Prisma + SQLite** (ORM y base de datos)
- **NextAuth.js** (autenticación)
- **Zustand** (estado global)
- **Tailwind CSS** (estilos)
- **bcryptjs** (hash de contraseñas)

## Características

- ✅ Catálogo de productos con categorías
- ✅ Carrito de compras (Zustand + localStorage)
- ✅ Checkout con WhatsApp y pago contra reembolso
- ✅ Sistema de afiliados con comisiones
- ✅ Panel de administración
- ✅ Panel de afiliado con estadísticas
- ✅ Gestión de pedidos (PENDING/CONFIRMED/CANCELLED)
- ✅ Wallet para administrador (ingresos y retiros)
- ✅ Responsive design (brutalist style)

## Instalación

```bash
npm install
npx prisma db push
npx prisma generate
npx ts-node --compilerOptions '{"module":"CommonJS"}' prisma/seed.ts
npm run dev
```

## Usuarios de prueba

- **Admin**: `denis` / `admin123`
- **Afiliado**: `afiliado` / `afiliado123` (código: AFILIADO)

## Scripts disponibles

```bash
npm run dev          # Desarrollo (puerto 3000 o 3001)
npm run build        # Build de producción
npm run lint         # Linting
npx prisma studio    # Editor de base de datos
```

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Homepage con categorías |
| `/productos` | Catálogo |
| `/checkout` | Checkout vía WhatsApp |
| `/admin` | Panel de administración |
| `/afiliado` | Panel de afiliado |
| `/login` | Inicio de sesión |

## Licencia

MIT
