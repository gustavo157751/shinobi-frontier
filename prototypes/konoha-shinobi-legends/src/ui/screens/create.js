/**
 * create.js — criação do protagonista (nome, gênero e estilo de luta).
 * Só aparece quando não existe progresso salvo.
 */

import { HERO_TEMPLATES, STYLES, statsFor } from '../../data/characters.js';
import { MISSIONS } from '../../data/missions.js';
import { game } from '../../core/state.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc } from '../../core/utils.js';

const STYLE_ORDER = ['taijutsu', 'ninjutsu', 'genjutsu'];

export function renderCreate(container, { onCreated }) {
  const draft = {
    name: '',
    gender: 'masculino',
    style: 'ninjutsu',
  };

  container.innerHTML = `
    <section class="create">
      <div class="create__bg" style="background-image:url('/assets/hero.webp')"></div>
      <div class="create__veil"></div>

      <div class="create__inner">
        <div class="create__intro">
          <span class="eyebrow">Vila da Folha · Registro de Genin</span>
          <h1 class="create__title">Todo shinobi<br /><em>começa com um nome.</em></h1>
          <p class="create__lead">
            Você acaba de receber o pergaminho de admissão da Academia. Escolha como luta, monte sua
            formação com ninjas lendários e cumpra missões de Rank D até o Rank S.
          </p>
          <ul class="create__facts">
            <li><b>5</b> combatentes por formação</li>
            <li><b>3</b> estilos de luta</li>
            <li><b>${MISSIONS.length}</b> missões na campanha</li>
          </ul>
        </div>

        <form class="create__panel" id="create-form" autocomplete="off">
          <div class="field">
            <label class="field__label" for="hero-name">Nome do shinobi</label>
            <input class="input" id="hero-name" name="name" maxlength="18" placeholder="Ex.: Haru, Rin, Kaede…" required />
            <p class="field__hint">Até 18 caracteres. Aparece em toda a interface.</p>
          </div>

          <div class="field">
            <span class="field__label">Gênero</span>
            <div class="segmented" id="gender-group" role="group" aria-label="Gênero">
              <button type="button" data-gender="masculino" class="segmented__item is-active">Masculino</button>
              <button type="button" data-gender="feminino" class="segmented__item">Feminino</button>
            </div>
            <p class="field__hint">Muda apenas a apresentação do protagonista — os atributos vêm do estilo.</p>
          </div>

          <div class="field">
            <span class="field__label">Estilo de luta</span>
            <div class="style-grid" id="style-grid">
              ${STYLE_ORDER.map((key) => {
                const style = STYLES[key];
                const hero = HERO_TEMPLATES[key];
                return `
                  <button type="button" class="style-card ${key === draft.style ? 'is-active' : ''}"
                    data-style="${key}" style="--style-color:${style.color}">
                    <span class="style-card__kanji">${style.kanji}</span>
                    <span class="style-card__name">${style.label}</span>
                    <span class="style-card__tagline">${style.tagline}</span>
                    <span class="style-card__stats">
                      <i>${hero.base.hp} vida</i><i>${hero.base.atk} ataque</i><i>${hero.base.spd} velocidade</i>
                    </span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="create__preview" id="create-preview"></div>

          <button class="btn btn--primary btn--lg create__submit" type="submit">
            Assinar o pergaminho e começar
          </button>
          <p class="create__save">O progresso é salvo automaticamente neste navegador.</p>
        </form>
      </div>
    </section>
  `;

  const form = container.querySelector('#create-form');
  const nameInput = container.querySelector('#hero-name');
  const preview = container.querySelector('#create-preview');

  function updatePreview() {
    const hero = HERO_TEMPLATES[draft.style];
    const style = STYLES[draft.style];
    const stats = statsFor(hero, 1);
    preview.innerHTML = `
      <div class="preview">
        <div class="preview__sigil" style="--style-color:${style.color}">${hero.sigil}</div>
        <div class="preview__body">
          <span class="preview__label">Sua ficha inicial</span>
          <strong class="preview__name">${esc(draft.name || 'Shinobi sem nome')}</strong>
          <p class="preview__desc">${style.desc}</p>
          <div class="preview__stats">
            <span><b>${stats.hp}</b> vida</span>
            <span><b>${stats.atk}</b> ataque</span>
            <span><b>${stats.def}</b> defesa</span>
            <span><b>${stats.spd}</b> velocidade</span>
            <span><b>${stats.chakraMax}</b> chakra</span>
          </div>
        </div>
      </div>
    `;
  }

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value.trim();
    updatePreview();
  });

  container.querySelectorAll('[data-gender]').forEach((button) => {
    button.addEventListener('click', () => {
      draft.gender = button.dataset.gender;
      container.querySelectorAll('[data-gender]').forEach((item) => item.classList.toggle('is-active', item === button));
      sfx.click();
    });
  });

  container.querySelectorAll('[data-style]').forEach((button) => {
    button.addEventListener('click', () => {
      draft.style = button.dataset.style;
      container.querySelectorAll('[data-style]').forEach((item) => item.classList.toggle('is-active', item === button));
      sfx.click();
      updatePreview();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (name.length < 2) {
      nameInput.focus();
      nameInput.classList.add('is-invalid');
      shell.toast('Escolha um nome com pelo menos 2 letras.', 'warn');
      return;
    }
    sfx.summon();
    game.start({ name, gender: draft.gender, style: draft.style });
    shell.refreshTopbar();
    showIntro(onCreated);
  });

  updatePreview();
  nameInput.focus();
}

/** Diálogo de abertura, no estilo de briefing de missão. */
function showIntro(onDone) {
  const playerName = game.state.player.name;
  const lines = [
    { who: 'Tsunade', text: `${playerName}, seu registro está assinado. A partir de hoje você responde diretamente à Hokage.` },
    { who: 'Kakashi', text: 'E eu fico com a parte ingrata: ensinar vocês a não morrer na primeira missão.' },
    { who: 'Naruto', text: 'Então já temos equipe! Eu, o Sasuke, a Sakura… e você.' },
    { who: 'Sasuke', text: 'Não fique animado. A primeira luta decide quem continua.' },
    { who: 'Kakashi', text: 'Regra número um: quando um inimigo flutuar ou cair, o resto da equipe ataca em cadeia. Isso é combo de perseguição. Memorizem.' },
  ];

  const modal = shell.openModal({
    title: 'Registro de Genin',
    subtitle: 'Konoha · Departamento de Missões',
    size: 'md',
    body: `
      <div class="dialog">
        ${lines
          .map(
            (line) => `
            <div class="dialog__line">
              <span class="dialog__who">${esc(line.who)}</span>
              <p class="dialog__text">${esc(line.text)}</p>
            </div>`,
          )
          .join('')}
      </div>
    `,
    actions: '<button class="btn btn--primary" data-start type="button">Entrar na Vila da Folha</button>',
    dismissable: false,
  });

  modal.querySelector('[data-start]').addEventListener('click', () => {
    sfx.victory();
    game.markIntroSeen();
    shell.closeModal(modal);
    onDone?.();
  });
}
