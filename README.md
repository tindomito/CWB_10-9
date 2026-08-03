## Tecnologías utilizadas

El proyecto es una **SPA de Vue 3** que corre enteramente en el cliente y usa **Supabase** como backend (no hay servidor propio).

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| [Vue 3](https://vuejs.org/) | 3.5 | Framework del front. Toda la UI está armada con componentes SFC (`.vue`). |
| [Vue Router](https://router.vuejs.org/) | 4.5 | Ruteo del lado del cliente en modo `history`, con un guard global (`beforeEach`) que protege las rutas marcadas como `requiresAuth`. |
| [Vite](https://vite.dev/) | 7.1 | Build tool y servidor de desarrollo con HMR. |
| [Tailwind CSS](https://tailwindcss.com/) | 4.1 | Estilos utility-first. Se integra como plugin de Vite (`@tailwindcss/vite`), sin `tailwind.config.js`. |
| [Supabase](https://supabase.com/) | 2.57 | Backend completo, vía `@supabase/supabase-js`. |
| [API-Sports (MMA)](https://api-sports.io/) | v1 | API externa de donde salen los peleadores, eventos y peleas reales. |

### Qué se usa de Supabase

- **Auth** — registro, login y logout con email/contraseña (`src/services/auth.js`).
- **Base de datos (Postgres)** — todas las tablas del proyecto (perfiles, publicaciones, comentarios, follows, mensajes, predicciones, rankings). El acceso se controla con **RLS** (Row Level Security) en cada tabla.
- **Realtime** — suscripciones por WebSocket para lo que se actualiza en vivo: chats (privado, grupal y público), comentarios, likes, notificaciones y resultados de peleas.
- **Storage** — subida y borrado de imágenes (avatares, portadas e imágenes de publicaciones), con URLs firmadas.

---

### Que es 10-9
**10-9** es una Progressive Web App para fanáticos del MMA y boxeo, centrada en el scoring en vivo de rounds, el debate de comunidad, los rankings en tiempo real y las predicciones de peleas. El nombre es una referencia directa al *must system* (sistema de puntuación universal en deportes de combate), donde el ganador del round recibe 10 puntos y el perdedor normalmente 9.

## Requisitos previos

- **Node.js** `^20.19.0` o `>=22.12.0` (lo exige Vite 7; probado con 22.16)
- **npm** (viene con Node)

No hace falta instalar ni configurar una base de datos: el backend es Supabase y ya está en la nube.

## Instalación

**1. Clonar el repositorio e ingresar a la carpeta** (o descargar el zip desde GitHub)

```bash
git clone https://github.com/tindomito/CWB_10-9.git
cd CWB_10-9
```

**2. Instalar las dependencias**

```bash
npm install
```


**3. Configurar las variables de entorno**

Crear un archivo **`.env`** en la raíz del proyecto (al lado del `package.json`) con este contenido:

```env
# Datos deportivos (API-Sports · MMA)
VITE_MMA_API_KEY=<tu-api-key-de-api-sports>
VITE_MMA_API_BASE_URL=https://v1.mma.api-sports.io

# Backend (Supabase)
VITE_SUPABASE_URL=<url-del-proyecto-supabase>
VITE_SUPABASE_KEY=<publishable-key-del-proyecto>
```

- **API-Sports** ([api-sports.io](https://api-sports.io/), sección MMA): de ahí salen los peleadores, eventos y peleas reales.
- **Supabase**: URL y *publishable key* del proyecto. Se sacan del panel de Supabase, en *Project Settings → API*. Esta key es pública por diseño (viaja al navegador); el acceso real a los datos lo controla RLS en cada tabla.

> **Importante:** la app consulta la **temporada en curso**, y el plan gratuito de API-Sports solo da acceso hasta 2024. Con una key del plan free las secciones de UFC se van a ver vacías. Hace falta una key de plan pago (Pro o superior).

---

## Cómo correr el proyecto

**Modo desarrollo** (con recarga automática):

```bash
npm run dev
```

La app queda disponible en **http://localhost:5173**.

**Build de producción** y previsualización del resultado:

```bash
npm run build
npm run preview
```

