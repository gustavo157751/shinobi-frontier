/**
 * village.js — hub de exploração de Konoha, com dados reais do save e atalhos funcionais.
 */

import { game, expToNext, TRAIN_COST, MEDITATE_COST, MEDITATE_STAMINA } from '../../core/state.js';
import { MISSIONS, RANKS } from '../../data/missions.js';
import { ROSTER } from '../../data/characters.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { sigilAvatar, rewardLine } from '../components.js';
import { esc, fmt } from '../../core/utils.js';
import { suggestNextMission } from './missions.js';

export function renderVillage(container, { navigate }) {
  const state = game.state;
  const hero = game.hero;
  const stats = game.heroStats();
  const nextMission = suggestNextMission();
  const rankMeta = nextMission ? RANKS[nextMission.rank] : null;
  const squad = game.squadCharacters();
  const completed = Object.keys(state.missions).length;
  const expGoal = expToNext(state.player.level);
  const expPercent = Math.min(100, (state.player.exp / expGoal) * 100);
  const scrollCount = state.scrolls.comum + state.scrolls.prata + state.scrolls.ouro;
  const briefing = nextMission?.brief?.[0];
  const travelTarget = nextMission?.place ?? 'Vila da Folha';
  const totalMissions = MISSIONS.length;
  const rosterSize = ROSTER.length;

  const missionPanel = nextMission
    ? `
      <article class="hub-panel hub-quest" style="--rank-color:${rankMeta.color}" aria-labelledby="hub-quest-title">
        <header class="hub-panel__head">
          <div>
            <span class="eyebrow">Quadro de missões</span>
            <h2 id="hub-quest-title">Objetivo prioritário</h2>
          </div>
          <span class="hub-quest__rank" aria-label="Rank ${esc(nextMission.rank)}">${esc(nextMission.rank)}</span>
        </header>
        <div class="hub-quest__body">
          <span class="hub-quest__place">${esc(nextMission.place)}</span>
          <h3>${esc(nextMission.name)}</h3>
          <p class="hub-quest__objective">${esc(nextMission.objective)}</p>
        </div>
        <div class="hub-quest__meta">
          <span>${completed} / ${totalMissions} missões</span>
          <span>Equipe: ${squad.length} / 5</span>
        </div>
        <div class="hub-quest__rewards">${rewardLine(nextMission.rewards)}</div>
        <button class="btn btn--primary hub-quest__button" data-next-mission="${esc(nextMission.id)}" type="button">
          Abrir briefing <span aria-hidden="true">↗</span>
        </button>
      </article>
    `
    : `
      <article class="hub-panel hub-quest hub-quest--complete" aria-labelledby="hub-quest-title">
        <header class="hub-panel__head">
          <div>
            <span class="eyebrow">Quadro de missões</span>
            <h2 id="hub-quest-title">Campanha concluída</h2>
          </div>
          <span class="hub-quest__rank" aria-hidden="true">完</span>
        </header>
        <div class="hub-quest__body">
          <span class="hub-quest__place">Vila da Folha</span>
          <h3>Konoha está em paz… por enquanto.</h3>
          <p class="hub-quest__objective">Reveja os contratos concluídos ou retorne às missões de Rank S para buscar recompensas.</p>
        </div>
        <div class="hub-quest__meta"><span>${completed} / ${totalMissions} missões</span></div>
        <button class="btn btn--ghost hub-quest__button" data-nav="missoes" type="button">Rever missões</button>
      </article>
    `;

  container.innerHTML = `
    <section class="village-hub" aria-label="Hub da Vila da Folha">
      <div class="village-hub__scene" aria-hidden="true"></div>
      <div class="village-hub__shade" aria-hidden="true"></div>

      <header class="village-hub__location">
        <span class="eyebrow">Konoha · ${greeting()}</span>
        <h1>Vila da Folha</h1>
        <p>${esc(hero.label ?? hero.title)} · ${fmt(stats.hp)} de vida · ${fmt(state.stats.victories)} vitórias</p>
        <div class="hub-progress" aria-label="Experiência até o próximo nível">
          <div class="hub-progress__labels"><span>Nv. ${state.player.level}</span><span>${fmt(state.player.exp)} / ${fmt(expGoal)} EXP</span></div>
          <span class="hub-progress__track"><i style="width:${expPercent}%"></i></span>
        </div>
      </header>

      <nav class="village-hub__shortcuts" aria-label="Atalhos da vila">
        <button class="hub-shortcut" data-nav="missoes" type="button" aria-label="Abrir missões">
          <span class="hub-shortcut__icon" aria-hidden="true">巻</span><span>Missões</span>
        </button>
        <button class="hub-shortcut" data-nav="equipe" type="button" aria-label="Gerenciar equipe">
          <span class="hub-shortcut__icon" aria-hidden="true">組</span><span>Equipe</span>
        </button>
        <button class="hub-shortcut" data-nav="pergaminhos" type="button" aria-label="Abrir pergaminhos">
          <span class="hub-shortcut__icon" aria-hidden="true">召</span><span>Pergaminhos <small>${fmt(scrollCount)}</small></span>
        </button>
        <button class="hub-shortcut" data-hub-action="train" type="button" aria-label="Treinar por ${TRAIN_COST} de chakra">
          <span class="hub-shortcut__icon" aria-hidden="true">修</span><span>Treinar</span>
        </button>
        <button class="hub-shortcut" data-hub-action="meditate" type="button" aria-label="Meditar e recuperar stamina">
          <span class="hub-shortcut__icon" aria-hidden="true">禅</span><span>Meditar</span>
        </button>
      </nav>

      ${nextMission ? `
        <button class="village-hub__mission-marker" data-next-mission="${esc(nextMission.id)}" type="button" aria-label="Abrir briefing da missão ${esc(nextMission.name)}">
          <span class="hub-marker__seal" aria-hidden="true">!</span>
          <span class="hub-marker__label">Nova missão<small>${esc(nextMission.place)}</small></span>
        </button>
      ` : ''}

      <aside class="village-hub__sidebar" aria-label="Mapa e missões">
        <section class="hub-panel hub-map" aria-labelledby="hub-map-title">
          <header class="hub-panel__head">
            <div><span class="eyebrow">Orientação</span><h2 id="hub-map-title">Mapa da região</h2></div>
            <span class="hub-map__compass" aria-hidden="true">北</span>
          </header>
          <div class="hub-map__chart" role="img" aria-label="Mapa esquemático da Vila da Folha e da rota sugerida; mapa ilustrativo, sem viagem interativa.">
            <svg viewBox="0 0 320 112" preserveAspectRatio="none" aria-hidden="true">
              <path class="hub-map__land" d="M0 17 34 4 71 16 101 7 131 20 165 8 196 19 228 6 263 15 292 4 320 14V112H0Z" />
              <path class="hub-map__river" d="M-10 93 C28 83 34 61 72 64S112 91 145 78 187 39 218 45s42 30 71 17 36-26 52-28" />
              <path class="hub-map__road" d="M38 92 C61 76 82 87 103 69s34-29 60-23 31 25 51 13 38-33 77-24" />
              <path class="hub-map__route" d="M48 82 C83 80 91 65 113 63S149 76 178 57 217 39 273 31" />
              <circle class="hub-map__dot" cx="48" cy="82" r="5" />
              <circle class="hub-map__destination" cx="273" cy="31" r="5" />
              <circle class="hub-map__landmark" cx="145" cy="27" r="3" />
              <circle class="hub-map__landmark" cx="233" cy="83" r="3" />
            </svg>
            <span class="hub-map__tag hub-map__tag--home">Konoha</span>
            <span class="hub-map__tag hub-map__tag--target">Rota</span>
          </div>
          <p class="hub-map__route-label"><span>Rota em destaque</span><strong>${esc(travelTarget)}</strong></p>
        </section>

        ${missionPanel}
      </aside>

      <div class="village-hub__left-tools">
        <section class="hub-feed" aria-label="Comunicado da missão">
          <span class="hub-feed__seal" aria-hidden="true">話</span>
          <div><span class="eyebrow">${esc(briefing?.who ?? 'Comunicado de Konoha')}</span>
            <p>${esc(briefing?.text ?? 'A equipe está pronta. Consulte o quadro para escolher uma nova missão.')}</p>
          </div>
        </section>
        <section class="hub-party" aria-label="Equipe ativa">
          <div class="hub-party__head"><span>Equipe</span><b>${squad.length} / 5</b></div>
          <div class="hub-party__members">
            ${squad.map((character) => `
              <button class="hub-party__member" data-open-character="${esc(character.id)}" type="button" aria-label="Abrir equipe e ver ${esc(character.name)}" title="${esc(character.name)}">
                ${sigilAvatar(character, { size: 'xs' })}
              </button>
            `).join('')}
          </div>
        </section>
      </div>

      <div class="village-hub__record" aria-label="Resumo do progresso">
        <span><b>${fmt(completed)}</b> missões</span><i aria-hidden="true"></i>
        <span><b>${fmt(state.stats.combos)}</b> perseguições</span><i aria-hidden="true"></i>
        <span><b>${fmt(state.ninjas.length)} / ${fmt(rosterSize)}</b> ninjas</span>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.nav));
  });

  container.querySelectorAll('[data-open-character]').forEach((button) => {
    button.addEventListener('click', () => navigate('equipe', { characterId: button.dataset.openCharacter }));
  });

  container.querySelectorAll('[data-next-mission]').forEach((button) => {
    button.addEventListener('click', () => navigate('missoes', { missionId: button.dataset.nextMission }));
  });

  container.querySelectorAll('[data-hub-action]').forEach((button) => {
    button.addEventListener('click', () => runHubAction(button.dataset.hubAction));
  });
}

function runHubAction(action) {
  if (action === 'train') {
    const result = game.train();
    if (!result.ok) {
      shell.toast(result.reason, 'warn');
      return;
    }
    sfx.levelUp();
    shell.refreshTopbar();
    shell.toast(`Treino concluído: +${result.exp} EXP`, 'success');
    if (result.leveledUp) shell.toast(`Nível ${result.newLevel}! Recursos restaurados.`, 'success');
  } else if (action === 'meditate') {
    const result = game.meditate();
    if (!result.ok) {
      shell.toast(result.reason, 'warn');
      return;
    }
    sfx.heal();
    shell.refreshTopbar();
    shell.toast(`Meditação: +${result.stamina} de stamina`, 'success');
  } else {
    return;
  }

  renderVillage(shell.screenEl, { navigate: shell.onNavigate });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'madrugada';
  if (hour < 12) return 'manhã';
  if (hour < 18) return 'tarde';
  return 'noite';
}
