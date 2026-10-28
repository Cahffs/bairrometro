// Páginas de texto (início, como calculamos, privacidade).
import { initPage } from './common.js';

initPage();

const note = document.getElementById('page-note');
if (note && new URLSearchParams(window.location.search).get('conta') === 'excluida') {
  note.textContent = 'Sua conta foi excluída, junto com os perfis e favoritos salvos.';
  note.hidden = false;
}
