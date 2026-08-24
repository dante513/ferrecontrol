# Fase 5 — Despliegue: Manual de Despliegue

## Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior (local o administrado, ej. Supabase, Railway, RDS)
- Un dominio o subdominio si se va a exponer públicamente (opcional para la
  sustentación; localhost es suficiente para demostrarlo en clase)

## 1. Base de datos

1. Crea una base de datos vacía (`ferre_control`).
2. Ejecuta `database/schema.sql` contra ella:
   ```bash
   psql -U tu_usuario -d ferre_control -f database/schema.sql
   ```
3. Genera un hash real para cada usuario de prueba (ver manual técnico) y
   actualízalo con `UPDATE usuarios SET password_hash = '...' WHERE email = '...'`.

## 2. Backend

```bash
cd backend
npm install
```

Variables de entorno necesarias (`.env`, nunca subir este archivo al
repositorio — ya está en `.gitignore`):

| Variable | Ejemplo | Notas |
|---|---|---|
| `PORT` | `5000` | Puerto donde escucha la API |
| `DATABASE_URL` | `postgres://usuario:password@host:5432/ferre_control` | Cadena de conexión completa |
| `NODE_ENV` | `production` | Activa SSL en la conexión a PostgreSQL |
| `FRONTEND_URL` | `https://tu-dominio.com` | Restringe CORS a ese origen exacto |
| `JWT_SECRET` | (valor propio, largo y aleatorio) | **Nunca reutilices el valor de `.env.example`** |

Arrancar:
```bash
npm start          # producción
npm run dev         # desarrollo, con nodemon
```

## 3. Frontend

```bash
cd frontend
npm install
```

Variable de entorno (`.env`):

| Variable | Ejemplo |
|---|---|
| `VITE_API_URL` | `https://api.tu-dominio.com` |

Generar el build de producción:
```bash
npm run build
```
Esto genera `frontend/dist/` — es una carpeta de archivos estáticos (HTML,
CSS, JS) que se puede servir desde cualquier hosting estático (Netlify,
Vercel, GitHub Pages, o un simple Nginx).

Para probar el build localmente antes de subirlo:
```bash
npm run preview
```

## 4. Checklist antes de desplegar a producción

- [ ] `JWT_SECRET` cambiado por un valor propio (no el de ejemplo)
- [ ] `FRONTEND_URL` en el backend apunta al dominio real (no `*`)
- [ ] `NODE_ENV=production` en el backend, para que la conexión a PostgreSQL use SSL
- [ ] Los usuarios de prueba tienen contraseñas reales, no los hashes de ejemplo del script SQL
- [ ] `.env` no está en el repositorio (verifica con `git status` que no aparezca)
- [ ] El build del frontend (`npm run build`) corre sin errores

## Nota sobre alcance

Esto cubre un despliegue simple de dos servicios (frontend estático +
backend Node.js) contra una base de datos administrada. No incluye
Docker, CI/CD ni balanceo de carga — no fueron parte de lo construido en
este proyecto, y para un proyecto formativo del SENA normalmente no se
exige ese nivel de infraestructura salvo que la guía de tu ficha lo pida
explícitamente.
