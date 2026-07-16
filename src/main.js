
// Importamos la función para crear la aplicación de Vue.
import { createApp } from 'vue';
import './style.css';
import router from './router/router';
import App from './App.vue';

// Creamos la aplicación para montarla en el HTML.
const app = createApp(App);
app.use(router); // Registramos el router.
app.mount('#app');

