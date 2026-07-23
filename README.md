# FeedTrack Web GMS — Node.js + Express + SQL Server

Ruta local del proyecto:
`C:\Users\arpa2\Dropbox\Desarrollo\FeedTrack Web GMS`

## Estructura
```
FeedTrack Web GMS/
├── config/
│   └── db.js          # Configuración de conexión a SQL Server (mssql)
├── routes/
│   └── usuarios.js     # Endpoints CRUD de ejemplo
├── public/              # Frontend (HTML/CSS/JS vanilla)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── server.js            # Punto de entrada de la app
├── package.json
├── .env                 # Tus credenciales reales (NO subir a git)
└── .env.example         # Plantilla de referencia
```

## Requisitos previos
- Node.js instalado (v18 o superior recomendado)
- Visual Studio con el workload "Node.js development" instalado
  (Visual Studio Installer → Modificar → marcar "Desarrollo de Node.js")
- Acceso a la instancia de SQL Server (IP, usuario y contraseña)

## Abrir el proyecto en Visual Studio
1. Descomprime el zip directamente dentro de:
   `C:\Users\arpa2\Dropbox\Desarrollo\`
   de modo que quede la carpeta:
   `C:\Users\arpa2\Dropbox\Desarrollo\FeedTrack Web GMS`
2. Abre Visual Studio.
3. Archivo → Abrir → Carpeta... → selecciona esa carpeta
   (`FeedTrack Web GMS`).
4. Visual Studio detectará automáticamente que es un proyecto Node.js
   (gracias al package.json).
5. Abre una terminal integrada (Ver → Terminal) y ejecuta:
   ```
   npm install
   ```

   > Nota: si usas Dropbox y notas que la sincronización se pone lenta o
   > da conflictos con `node_modules` (son miles de archivos pequeños),
   > puedes agregar `node_modules` a "Selective Sync" de Dropbox para
   > excluirlo de la sincronización en la nube, ya que se regenera con
   > `npm install`.

## Base de datos
1. En SQL Server, crea la tabla de ejemplo usada por las rutas:
   ```sql
   CREATE TABLE Usuarios (
     id INT IDENTITY(1,1) PRIMARY KEY,
     nombre NVARCHAR(100) NOT NULL,
     correo NVARCHAR(150) NOT NULL
   );
   ```
2. Revisa el archivo `.env` y confirma que `DB_DATABASE` tenga el nombre
   correcto de tu base de datos (los demás datos de conexión ya están
   cargados: servidor 192.168.4.18, usuario AR).

## Ejecutar el proyecto
```
npm run dev
```
Esto levanta el servidor con nodemon (recarga automática) en:
http://localhost:3000

Si prefieres correrlo sin recarga automática:
```
npm start
```

## Estructura del frontend
- `login.html` — pantalla de login.
- `index.html` — Inicio / Dashboard (pantalla de bienvenida tras el login).
- `usuarios.html` — módulo de gestión de usuarios (CRUD de ejemplo).
- `reportes.html` — módulo de Reportes / Estadísticas (placeholder, pendiente
  de implementar).
- `css/layout.css` + `js/layout.js` — sidebar y topbar compartidos por todas
  las páginas protegidas (menú colapsable con botón hamburguesa, guardia de
  sesión, logout, resaltado del link activo).
- `js/layout.js` también expone `authHeaders()` y `manejarRespuesta()`,
  usadas por `app.js` (y por cualquier script nuevo que agregues) para las
  llamadas autenticadas a la API.

### Agregar un nuevo módulo al menú
1. Crea el archivo `public/nuevo-modulo.html` copiando la estructura de
   `reportes.html` (mismo `app-shell`, sidebar y topbar).
2. Ponle `data-page="nuevo-modulo"` al `<body>`.
3. Agrega el link en el `<nav>` del sidebar **en todas las páginas**:
   `<a href="nuevo-modulo.html" data-page="nuevo-modulo">🆕 Nuevo módulo</a>`
4. Agrega el título en `TITULOS_PAGINA` dentro de `js/layout.js`.
5. Incluye `<script src="js/layout.js"></script>` antes de tu script propio.

## Login
- Pantalla: `public/login.html`
- Backend: `POST /api/auth/login` (body: `{ usuario, contrasena }`)
  ejecuta el stored procedure `[dbo].[VerificarLogin]` contra la tabla
  `P_Usuarios`. Si `IdUsuario` es distinto de 0, se genera un JWT.
- El token se guarda en `localStorage` y se envía en cada petición
  protegida con el header `Authorization: Bearer <token>`.
- Todas las rutas bajo `/api/usuarios` están protegidas con el
  middleware `middleware/auth.js`.
- `index.html` redirige automáticamente a `login.html` si no hay token
  guardado, y `login.html` redirige a `index.html` si ya hay uno.
- El logo actual es un placeholder (`public/img/logo-placeholder.svg`).
  Cuando tengas el logo real, reemplaza ese archivo o cambia la ruta en
  `login.html` (`<img src="img/logo-placeholder.svg" ...>`).

## Endpoints disponibles
| Método | Ruta                    | Protegida | Descripción                          |
|--------|-------------------------|-----------|----------------------------------------|
| POST   | /api/auth/login         | No        | Inicia sesión y devuelve un JWT        |
| GET    | /api/auth/verificar     | No        | Valida si un token sigue siendo válido |
| GET    | /api/usuarios           | Sí        | Lista todos los usuarios               |
| GET    | /api/usuarios/:id       | Sí        | Obtiene un usuario                     |
| POST   | /api/usuarios           | Sí        | Crea un usuario                        |
| PUT    | /api/usuarios/:id       | Sí        | Actualiza un usuario                   |
| DELETE | /api/usuarios/:id       | Sí        | Elimina un usuario                     |

## Notas de seguridad
- Nunca subas el archivo `.env` a un repositorio (agrégalo a `.gitignore`).
- En producción, cambia `DB_ENCRYPT` según corresponda y usa un usuario de
  base de datos con permisos mínimos necesarios.
- Cambia `JWT_SECRET` en `.env` por una cadena larga y aleatoria antes de
  pasar a producción (no dejes el valor de ejemplo).
- El stored procedure `VerificarLogin` compara la contraseña directamente
  contra la columna `Contraseña` de `P_Usuarios`. Si esa columna guarda la
  contraseña en texto plano, es recomendable migrar a un hash (por ejemplo
  con `bcrypt`) más adelante; por ahora el login funciona tal cual está la
  base de datos actual.
