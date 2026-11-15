/**
 * shell.js — casca fixa do jogo: barra de recursos, menu lateral,
 * modais, confirmações e notificações.
 */

import { game } from '../core/state.js';
import { sfx, setMuted } from '../core/audio.js';
import { esc, fmt, fmtDuration, qs } from '../core/utils.js';

const NAV_ITEMS = [
  { id: 'vila', kanji: '里', label: 'Vila', hint: 'Painel do shinobi' },
  { id: 'missoes', kanji: '巻', label: 'Missões', hint: 'Rank D ao S' },
  { id: 'equipe', kanji: '組', label: 'Equipe', hint: 'Formação de combate' },
  { id: 'pergaminhos', kanji: '召', label: 'Pergaminhos', hint: 'Invocação e loja' },
];

class Shell {
  constructor() {
    this.root = null;
    this.screenEl = null;
    this.navEl = null;
    this.resourceEls = {};
    this.activeTab = 'vila';
    this.onNavigate = () => {};
    this.battleMode = false;
    this.modalLayer = null;
    this.toastLayer = null;
    this.timer = null;
  }

  mount(root, { onNavigate }) {
    this.root = root;
    this.onNavigate = onNavigate;
    root.innerHTML = `
      <header class="topbar">
        <button class="brand" data-nav="vila" type="button" aria-label="Ir para a vila">
          <span class="brand__seal">忍</span>
          <span class="brand__text">
            <strong>Konoha Shinobi Legends</strong>
            <small>RPG de turnos · Vila da Folha</small>
          </span>
        </button>

        <div class="resources" id="resources">
          ${this.resourceMarkup('chakra', '気', 'Chakra', 'Usado em treino e meditação')}
          ${this.resourceMarkup('stamina', '力', 'Stamina', 'Gasta ao entrar em missões')}
          ${this.resourceMarkup('ryos', '両', 'Ryos', 'Moeda da vila')}
          ${this.resourceMarkup('gold', '金', 'Ouro', 'Moeda rara')}
        </div>

        <div class="topbar__actions">
          <button class="icon-btn" id="sfx-toggle" type="button" title="Ligar/desligar som">♪</button>
          <button class="icon-btn" id="settings-btn" type="button" title="Configurações">⚙</button>
          <div class="profile-chip" id="profile-chip"></div>
        </div>
      </header>

      <div class="app-body">
        <nav class="rail" id="rail" aria-label="Menu principal">
          ${NAV_ITEMS.map(
            (item) => `
            <button class="rail__item" data-nav="${item.id}" type="button" title="${item.hint}">
              <span class="rail__kanji">${item.kanji}</span>
              <span class="rail__label">${item.label}</span>
            </button>`,
          ).join('')}
          <div class="rail__foot">
            <div class="rail__level" id="rail-level">Nv. 1</div>
            <div class="rail__player" id="rail-player">Shinobi</div>
          </div>
        </nav>
        <main class="screen" id="screen" tabindex="-1"></main>
      </div>

      <div class="toast-layer" id="toast-layer" aria-live="polite"></div>
      <div class="modal-layer" id="modal-layer"></div>
    `;

    this.screenEl = qs('#screen', root);
    this.navEl = qs('#rail', root);
    this.modalLayer = qs('#modal-layer', root);
    this.toastLayer = qs('#toast-layer', root);

    this.resourceEls = {
      chakra: this.getResEl('chakra'),
      stamina: this.getResEl('stamina'),
      ryos: this.getResEl('ryos'),
      gold: this.getResEl('gold'),
    };

    root.querySelectorAll('[data-nav]').forEach((button) => {
      button.addEventListener('click', () => this.navigate(button.dataset.nav));
    });

    qs('#settings-btn', root).addEventListener('click', () => this.openSettings());
    qs('#sfx-toggle', root).addEventListener('click', () => {
      const enabled = game.toggleSfx();
      setMuted(!enabled);
      this.refreshTopbar();
      this.toast(enabled ? 'Som ligado' : 'Som desligado');
    });

    setMuted(!(game.state?.settings?.sfx ?? true));
    this.refreshTopbar();
    this.refreshResources();

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      game.tick();
      this.refreshResources();
    }, 1000);
  }

  getResEl(kind) {
    const el = qs(`#res-${kind}`, this.root);
    return {
      el,
      value: qs('.res__value', el),
      bar: qs('.res__bar > i', el),
      timer: qs('.res__timer', el),
    };
  }

  resourceMarkup(kind, kanji, label, hint) {
    return `
      <div class="res res--${kind}" id="res-${kind}" title="${hint}">
        <span class="res__icon">${kanji}</span>
        <div class="res__body">
          <span class="res__label">${label}</span>
          <span class="res__value">0</span>
          <span class="res__bar"><i style="width:0%"></i></span>
        </div>
        <span class="res__timer"></span>
      </div>
    `;
  }

  refreshResources() {
    if (!game.state) return;
    const snap = game.resourceSnapshot();

    this.resourceEls.chakra.value.textContent = `${snap.chakra}/${snap.chakraMax}`;
    this.resourceEls.chakra.bar.style.width = `${(snap.chakra / snap.chakraMax) * 100}%`;
    this.resourceEls.chakra.timer.textContent = snap.chakra >= snap.chakraMax ? 'cheio' : `+1 em ${fmtDuration(game.secondsToNext('chakra'))}`;

    this.resourceEls.stamina.value.textContent = `${snap.stamina}/${snap.staminaMax}`;
    this.resourceEls.stamina.bar.style.width = `${(snap.stamina / snap.staminaMax) * 100}%`;
    this.resourceEls.stamina.timer.textContent =
      snap.stamina >= snap.staminaMax ? 'cheia' : `+1 em ${fmtDuration(game.secondsToNext('stamina'))}`;

    this.resourceEls.ryos.value.textContent = fmt(snap.ryos);
    this.resourceEls.gold.value.textContent = fmt(snap.gold);
  }

  refreshTopbar() {
    if (!game.state) return;
    const profile = qs('#profile-chip', this.root);
    const level = game.level;
    profile.innerHTML = `
      <span class="profile-chip__avatar">${esc(game.hero.sigil)}</span>
      <span class="profile-chip__info">
        <strong>${esc(game.state.player.name)}</strong>
        <small>Nv. ${level} · ${esc(game.hero.label ?? '')}</small>
      </span>
      <span class="profile-chip__level">${level}</span>
    `;
    qs('#rail-level', this.root).textContent = `Nv. ${level}`;
    qs('#rail-player', this.root).textContent = game.state.player.name;
    qs('#sfx-toggle', this.root).classList.toggle('is-off', !game.state.settings.sfx);
    this.refreshResources();
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    this.root.querySelectorAll('.rail__item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.nav === tab);
    });
  }

  navigate(tab) {
    if (tab === this.activeTab && !this.battleMode) return;
    sfx.click();
    this.onNavigate(tab);
  }

  setBattleMode(enabled) {
    this.battleMode = enabled;
    this.root.classList.toggle('is-battle', enabled);
    this.navEl.querySelectorAll('.rail__item').forEach((item) => {
      item.disabled = enabled;
      item.classList.toggle('is-disabled', enabled);
    });
  }

  /* -------------------------------- modal -------------------------------- */

  openModal({ title = '', subtitle = '', body = '', size = 'md', actions = '', dismissable = true, className = '' }) {
    const modal = document.createElement('div');
    modal.className = `modal modal--${size} ${className}`;
    modal.innerHTML = `
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="modal__head">
          <div>
            ${subtitle ? `<span class="modal__subtitle">${subtitle}</span>` : ''}
            <h2 class="modal__title">${title}</h2>
          </div>
          ${dismissable ? '<button class="icon-btn modal__close" data-close="1" type="button" aria-label="Fechar">×</button>' : ''}
        </header>
        <div class="modal__body">${body}</div>
        ${actions ? `<footer class="modal__actions">${actions}</footer>` : ''}
      </div>
    `;
    this.modalLayer.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));

    if (dismissable) {
      modal.querySelectorAll('[data-close]').forEach((el) => {
        el.addEventListener('click', () => this.closeModal(modal));
      });
      this.escapeHandler = (event) => {
        if (event.key === 'Escape') this.closeModal(modal);
      };
      document.addEventListener('keydown', this.escapeHandler);
    }
    return modal;
  }

  closeModal(modal = this.modalLayer.lastElementChild) {
    if (!modal) return;
    modal.classList.remove('is-open');
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    setTimeout(() => modal.remove(), 180);
  }

  closeAllModals() {
    this.modalLayer.innerHTML = '';
  }

  confirm({ title, text, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    return new Promise((resolve) => {
      const modal = this.openModal({
        title,
        subtitle: danger ? 'Ação permanente' : 'Confirmação',
        body: `<p class="modal__text">${text}</p>`,
        actions: `
          <button class="btn btn--ghost" data-result="0" type="button">${cancelLabel}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-result="1" type="button">${confirmLabel}</button>
        `,
        size: 'sm',
      });
      modal.querySelectorAll('[data-result]').forEach((button) => {
        button.addEventListener('click', () => {
          resolve(button.dataset.result === '1');
          this.closeModal(modal);
        });
      });
      modal.querySelector('[data-close]')?.addEventListener('click', () => resolve(false));
    });
  }

  openSettings() {
    const state = game.state;
    if (!state) return;
    const created = new Date(state.createdAt).toLocaleDateString('pt-BR');
    const modal = this.openModal({
      title: 'Configurações',
      subtitle: 'Progresso salvo neste navegador',
      size: 'sm',
      body: `
        <div class="settings">
          <div class="settings__row">
            <div>
              <strong>Efeitos sonoros</strong>
              <p>Sons sintetizados de golpes, combos e invocações.</p>
            </div>
            <button class="btn btn--ghost btn--sm" id="settings-sfx" type="button">${state.settings.sfx ? 'Ligado' : 'Desligado'}</button>
          </div>
          <div class="settings__row">
            <div>
              <strong>Progresso</strong>
              <p>Nível ${state.player.level} · ${state.stats.victories} vitórias · ${state.stats.combos} perseguições · criado em ${created}</p>
            </div>
          </div>
          <div class="settings__row">
            <div>
              <strong>Apagar progresso</strong>
              <p>Recomeça do zero, incluindo protagonista e equipe. Não pode ser desfeito.</p>
            </div>
            <button class="btn btn--danger btn--sm" id="settings-reset" type="button">Apagar</button>
          </div>
        </div>
      `,
    });

    modal.querySelector('#settings-sfx').addEventListener('click', (event) => {
      const enabled = game.toggleSfx();
      setMuted(!enabled);
      event.currentTarget.textContent = enabled ? 'Ligado' : 'Desligado';
      qs('#sfx-toggle', this.root).classList.toggle('is-off', !enabled);
    });

    modal.querySelector('#settings-reset').addEventListener('click', async () => {
      this.closeModal(modal);
      const ok = await this.confirm({
        title: 'Apagar todo o progresso?',
        text: 'Seu protagonista, ninjas invocados, nível e missões serão perdidos permanentemente.',
        confirmLabel: 'Apagar e recomeçar',
        danger: true,
      });
      if (ok) {
        game.reset();
        window.location.reload();
      }
    });
  }

  /* -------------------------------- toasts ------------------------------- */

  toast(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.textContent = text;
    this.toastLayer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }
}

export const shell = new Shell();
