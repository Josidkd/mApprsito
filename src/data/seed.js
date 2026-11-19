import { dateKey, shiftDay } from '../lib/date.js';
export function seed() {
  const today = dateKey();
  return {
    version: 1,
    profiles: [{ id: 'alex', name: 'Álex', color: 'coral' }, { id: 'sam', name: 'Sam', color: 'sage' }],
    activeProfileId: null,
    events: [
      { id: 'picnic', title: 'Un picnic sin prisas', date: shiftDay(today, 2), time: '13:30', description: 'Algo rico, una manta y un ratito al aire libre. ¡Nos vemos en el parque!', image: '', info: '', profileId: 'alex', attendance: { alex: 'yes' }, comments: [{ id: 'c1', profileId: 'sam', text: 'Yo llevo el postre 🍓', createdAt: new Date().toISOString() }] },
      { id: 'cine', title: 'Noche de cine en casa', date: today, time: '21:00', description: 'Elegimos peli y preparamos palomitas.', image: '', info: '', profileId: 'sam', attendance: {}, comments: [] }
    ],
    tasks: [
      { id: 't1', title: 'Llenar la nevera', description: 'Fruta, yogur, tomates y algo para el desayuno.', done: false, profileId: 'alex' },
      { id: 't2', title: 'Dar un mimo a las plantas', description: 'Regar las del salón y girar la monstera.', done: false, profileId: 'sam' },
      { id: 't3', title: 'Poner la lavadora', description: 'La ropa de color, a 30 grados.', done: true, profileId: 'alex' }
    ],
    recipes: [
      { id: 'r1', title: 'Pasta al pesto', ingredients: ['200 g de pasta', 'Un puñado de albahaca', '30 g de parmesano', 'Aceite de oliva', 'Piñones y sal'], instructions: 'Cuece la pasta al dente.\nTritura la albahaca con aceite, parmesano y piñones.\nMezcla con la pasta y un poco del agua de cocción.', image: '', info: '', profileId: 'alex', emoji: '🍝' },
      { id: 'r2', title: 'Ensalada de verano', ingredients: ['2 tomates', '1 pepino', 'Queso feta', 'Aceite de oliva y orégano'], instructions: 'Corta las verduras. Añade el queso y aliña al gusto. Sirve bien fresquita.', image: '', info: '', profileId: 'sam', emoji: '🥗' },
      { id: 'r3', title: 'Tostadas con aguacate', ingredients: ['2 rebanadas de pan', '1 aguacate', 'Limón y sal'], instructions: 'Tuesta el pan. Machaca el aguacate con limón y sal. Reparte sobre las tostadas.', image: '', info: '', profileId: 'alex', emoji: '🥑' }
    ],
    menu: { [today]: { lunch: 'r1', dinner: 'r2' } },
    expenses: [
      { id: 'g1', concept: 'La compra de la semana', cents: 4850, profileId: 'alex', date: today },
      { id: 'g2', concept: 'Cena del viernes', cents: 3200, profileId: 'sam', date: today }
    ],
    settlements: [], storageWarning: ''
  };
}
