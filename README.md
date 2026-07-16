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

- **Node.js** 
- **npm** 



## Instalación

**1. Clonar el repositorio e ingresar a la carpeta o descargar zip**

```bash
git clone 
```

**2. Instalar las dependencias**

```bash
npm install
```


**3. Configurar las variables de entorno**

Crear un archivo **`.env`** en la raíz del proyecto (al lado del `package.json`) con este contenido:

```env


```


---

## Cómo correr el proyecto


```bash
npm run dev
```

La app queda disponible en **http://localhost:5173**.

