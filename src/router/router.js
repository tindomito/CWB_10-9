import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import PublicChat from '../pages/PublicChat.vue';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';
import Profile from '../pages/Profile.vue';
import Settings from '../pages/Settings.vue';
import Publications from '../pages/Publications.vue';
import PrivateChat from '../pages/PrivateChat.vue';
import Messages from '../pages/Messages.vue';
import Fighters from '../pages/Fighters.vue';
import Predictions from '../pages/Predictions.vue';
import Leaderboards from '../pages/Leaderboards.vue';
import Notifications from '../pages/Notifications.vue';
import GroupChat from '../pages/GroupChat.vue';
import Scorecard from '../pages/Scorecard.vue';
import RankingEditor from '../pages/RankingEditor.vue';
import RankingDetail from '../pages/RankingDetail.vue';
import PublicationDetail from '../pages/PublicationDetail.vue';
import EventDetail from '../pages/EventDetail.vue';
import FightDetail from '../pages/FightDetail.vue';

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