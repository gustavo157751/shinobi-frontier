/**
 * main.js — ponto de entrada: carrega o save, monta a casca e roteia as telas.
 */

import './styles/base.css';
import './styles/layout.css';
import './styles/screens.css';
import './styles/battle.css';

import { game } from './core/state.js';
import { getMission } from './data/missions.js';
import { shell } from './ui/shell.js';
import { renderCreate } from './ui/screens/create.js';
import { renderVillage } from './ui/screens/village.js';
import { renderMissions } from './ui/screens/missions.js';
import { renderTeam } from './ui/screens/team.js';
import { renderScrolls } from './ui/screens/scrolls.js';
import { renderBattle } from './ui/screens/battle.js';

const app = document.getElementById('app');
let mounted = false;

const routes = {
  vila: (screen) => renderVillage(screen, { navigate }),
  missoes: (screen, params) =>
    renderMissions(screen, {
      navigate,
      focusMission: params.missionId ? getMission(params.missionId) : null,
    }),
  equipe: (screen, params) => renderTeam(screen, { characterId: params.characterId ?? null }),
  pergaminhos: (screen) => renderScrolls(screen, { navigate }),
  batalha: (screen, params) => renderBattle(screen, { missionId: params.missionId, navigate }),
  criar: (screen) => renderCreate(screen, { onCreated: () => enterGame() }),
};

function mountShell() {
  if (mounted) return;
  shell.mount(app, { onNavigate: (tab) => navigate(tab) });
  mounted = true;
}

function navigate(tab, params = {}) {
  if (!game.state) {
    showCreate();
    return;
  }
  if (!mounted) mountShell();
  const screen = document.getElementById('screen');
  if (!screen) return;

  // Telas de combate ocupam toda a área (sem padding) e travam o menu.
  const isBattle = tab === 'batalha';
  shell.setBattleMode(isBattle);
  screen.className = `screen${isBattle ? ' screen--battle' : ''}`;
  screen.scrollTop = 0;
  screen.innerHTML = '';

  if (tab !== 'batalha') shell.setActiveTab(tab);
  app.classList.remove('is-onboarding');

  const render = routes[tab] ?? routes.vila;
  try {
    const result = render(screen, params);
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error('Erro ao renderizar a tela:', error);
        shell.toast('Algo deu errado nesta tela. Voltando à vila.', 'error');
        navigate('vila');
      });
    }
  } catch (error) {
    console.error('Erro ao renderizar a tela:', error);
    shell.toast('Algo deu errado nesta tela. Voltando à vila.', 'error');
    navigate('vila');
  }
}

function showCreate() {
  mountShell();
  shell.setBattleMode(false);
  shell.closeAllModals();
  app.classList.add('is-onboarding');
  const screen = document.getElementById('screen');
  screen.className = 'screen';
  renderCreate(screen, { onCreated: () => enterGame() });
}

function enterGame() {
  app.classList.remove('is-onboarding');
  shell.refreshTopbar();
  navigate('vila');
}

/* ------------------------------- inicialização ---------------------------- */

function boot() {
  const hasProgress = game.load();
  mountShell();
  if (hasProgress) {
    shell.refreshTopbar();
    navigate('vila');
  } else {
    showCreate();
  }

  // Mantém a interface de recursos sincronizada após ações em qualquer tela.
  game.subscribe(() => shell.refreshResources());
}

boot();

// Expõe o estado no console para depuração/ajuste de balanceamento.
window.konoha = { game, navigate };
