import { createRouter, createWebHistory } from 'vue-router';

/**
 * Las páginas se importan de forma diferida (lazy loading): cada una viaja en
 * su propio archivo y el navegador lo descarga recién cuando se entra a esa
 * ruta.
 *
 * Con imports estáticos, Vite empaquetaba las 20 páginas juntas y quien abría
 * el inicio se bajaba también el editor de rankings, los chats y los ajustes
 * sin usarlos. La función `() => import(...)` es lo que le indica a Vite dónde
 * cortar el bundle.
 */
const Home              = () => import('../pages/Home.vue');
const PublicChat        = () => import('../pages/PublicChat.vue');
const Login             = () => import('../pages/Login.vue');
const Register          = () => import('../pages/Register.vue');
const Profile           = () => import('../pages/Profile.vue');
const Settings          = () => import('../pages/Settings.vue');
const Publications      = () => import('../pages/Publications.vue');
const PrivateChat       = () => import('../pages/PrivateChat.vue');
const Messages          = () => import('../pages/Messages.vue');
const Fighters          = () => import('../pages/Fighters.vue');
const Predictions       = () => import('../pages/Predictions.vue');
const Leaderboards      = () => import('../pages/Leaderboards.vue');
const Notifications     = () => import('../pages/Notifications.vue');
const GroupChat         = () => import('../pages/GroupChat.vue');
const Scorecard         = () => import('../pages/Scorecard.vue');
const RankingEditor     = () => import('../pages/RankingEditor.vue');
const RankingDetail     = () => import('../pages/RankingDetail.vue');
const PublicationDetail = () => import('../pages/PublicationDetail.vue');
const EventDetail       = () => import('../pages/EventDetail.vue');
const FightDetail       = () => import('../pages/FightDetail.vue');
const NotFound          = () => import('../pages/NotFound.vue');

// Definimos la lista de rutas de nuestra aplicación
const routes = [
    {
        path: '/',
        component: Home,
        name: 'Home'
    },
    {
        path: '/chat',
        component: PublicChat,
        name: 'PublicChat'
    },
    {
        path: '/ingresar',
        component: Login,
        name: 'Login'
    },
    {
        path: '/registro',
        component: Register,
        name: 'Register'
    },
    {
        path: '/perfil/:id?',
        component: Profile,
        name: 'Profile',
        props: true
    },
    {
        path: '/ajustes',
        component: Settings,
        name: 'Settings',
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/publicaciones',
        component: Publications,
        name: 'Publications',
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/publicaciones/:id',
        component: PublicationDetail,
        name: 'PublicationDetail',
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/chat/:displayName',
        component: PrivateChat,
        name: 'PrivateChat',
        props: true,
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/mensajes',
        component: Messages,
        name: 'Messages',
        meta: {
            requiresAuth: true
        }
    },
    {
        path: '/peleadores',
        component: Fighters,
        name: 'Fighters'
    },
    {
        path: '/evento/:slug',
        component: EventDetail,
        name: 'EventDetail'
    },
    {
        path: '/pelea/:fightId',
        component: FightDetail,
        name: 'FightDetail'
    },
    {
        path: '/predicciones',
        component: Predictions,
        name: 'Predictions'
    },
    {
        path: '/clasificaciones',
        component: Leaderboards,
        name: 'Leaderboards'
    },
    {
        path: '/notificaciones',
        component: Notifications,
        name: 'Notifications',
        meta: { requiresAuth: true }
    },
    {
        path: '/grupo/:id',
        component: GroupChat,
        name: 'GroupChat',
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: '/tarjeta/:fight_id',
        component: Scorecard,
        name: 'Scorecard',
        meta: { requiresAuth: true }
    },
    {
        path: '/rankings/nuevo',
        component: RankingEditor,
        name: 'RankingNew',
        meta: { requiresAuth: true }
    },
    {
        path: '/rankings/:id/editar',
        component: RankingEditor,
        name: 'RankingEdit',
        meta: { requiresAuth: true }
    },
    {
        path: '/rankings/:id',
        component: RankingDetail,
        name: 'RankingDetail'
    },
    // Catch-all: va último, así solo atrapa lo que ninguna ruta anterior
    // reconoció. En producción el servidor responde index.html para cualquier
    // URL (lo necesita el modo history), así que sin esto una dirección
    // inexistente dejaría la app en blanco.
    {
        path: '/:pathMatch(.*)*',
        component: NotFound,
        name: 'NotFound'
    }
];

const router = createRouter({
    routes,
    history: createWebHistory(),
});

// Guard global: corre antes de cada navegación. Espera a que la sesión de
// Supabase esté inicializada y, si la ruta pide auth (meta.requiresAuth)
// y no hay usuario, manda a /ingresar guardando a dónde quería ir en
// ?redirect para volver después del login.
router.beforeEach(async (to, from, next) => {
    // Importar composable de auth
    const { useAuth } = await import('../composables/useAuth.js');
    const { isAuthenticated, initialize } = useAuth();

    // Asegurar que la autenticación esté inicializada
    await initialize();

    // Verificar si la ruta requiere autenticación
    if (to.meta.requiresAuth) {
        if (!isAuthenticated.value) {
            // Redireccionar al login si no está autenticado
            next({
                name: 'Login',
                query: { redirect: to.fullPath }
            });
            return;
        }
    }

    // Si va a /profile sin ID y está autenticado, redirigir a su propio perfil
    if (to.name === 'Profile' && !to.params.id) {
        const { userId } = useAuth();

        if (isAuthenticated.value && userId.value) {
            next({
                name: 'Profile',
                params: { id: userId.value }
            });
            return;
        }
    }

    next();
});

export default router;