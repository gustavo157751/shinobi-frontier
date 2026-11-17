/**
 * missions.js — quadro de missões (Rank D ao S) e briefing antes da batalha.
 */

import { MISSIONS, RANKS, getMission } from '../../data/missions.js';
import { getCharacter } from '../../data/characters.js';
import { game } from '../../core/state.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, fmt } from '../../core/utils.js';
import { sigilAvatar, rewardLine } from '../components.js';

const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];

/** Sugere a próxima missão: primeira liberada e ainda não concluída. */
export function suggestNextMission() {
  const unlocked = MISSIONS.filter((mission) => game.level >= mission.minLevel);
  if (!unlocked.length) return MISSIONS[0];
  const pending = unlocked.find((mission) => !game.state.missions[mission.id]);
  return pending ?? unlocked[unlocked.length - 1];
}

export function renderMissions(container, { navigate, focusMission }) {
  let initial = focusMission ?? null;
  let activeRank = initial?.rank ?? suggestNextMission()?.rank ?? 'D';

  function draw() {
    const missions = MISSIONS.filter((mission) => mission.rank === activeRank);
    container.innerHTML = `
      <section class="missions">
        <header class="screen-head">
          <div>
            <span class="eyebrow">Departamento de Missões · Konoha</span>
            <h1>Quadro de missões</h1>
            <p>Escolha um rank, leia o briefing da equipe e entre em combate. Stamina é gasta ao iniciar.</p>
          </div>
          <div class="screen-head__stats">
            <div><b>${fmt(game.resourceSnapshot().stamina)}</b><span>Stamina</span></div>
            <div><b>${game.level}</b><span>Nível</span></div>
            <div><b>${Object.keys(game.state.missions).length}/${MISSIONS.length}</b><span>Concluídas</span></div>
          </div>
        </header>

        <div class="rank-tabs">
          ${RANK_ORDER.map((rank) => {
            const meta = RANKS[rank];
            const list = MISSIONS.filter((mission) => mission.rank === rank);
            const available = list.filter((mission) => game.level >= mission.minLevel).length;
            return `
              <button class="rank-tab ${rank === activeRank ? 'is-active' : ''}" data-rank="${rank}"
                style="--rank-color:${meta.color}" type="button">
                <span class="rank-tab__letter">${rank}</span>
                <span class="rank-tab__info">
                  <strong>${meta.label}</strong>
                  <small>${available} de ${list.length} liberadas</small>
                </span>
              </button>
            `;
          }).join('')}
        </div>

        <p class="rank-desc">${RANKS[activeRank].desc}</p>

        <div class="mission-list">
          ${missions.map((mission) => missionCard(mission)).join('')}
        </div>
      </section>
    `;

    container.querySelectorAll('[data-rank]').forEach((button) => {
      button.addEventListener('click', () => {
        activeRank = button.dataset.rank;
        sfx.click();
        draw();
      });
    });

    container.querySelectorAll('[data-brief]').forEach((button) => {
      button.addEventListener('click', () => openBriefing(button.dataset.brief, navigate));
    });

    if (initial) {
      const mission = getMission(initial.id);
      initial = null;
      if (mission) setTimeout(() => openBriefing(mission.id, navigate), 120);
    }
  }

  draw();
}

function missionCard(mission) {
  const rank = RANKS[mission.rank];
  const locked = game.level < mission.minLevel;
  const record = game.missionRecord(mission.id);
  const cleared = record.wins > 0;
  return `
    <article class="mission-card ${locked ? 'is-locked' : ''} ${cleared ? 'is-cleared' : ''}" style="--rank-color:${rank.color}">
      <div class="mission-card__rank"><span>${mission.rank}</span><small>${mission.stamina} 力</small></div>
      <div class="mission-card__body">
        <div class="mission-card__title">
          <h3>${esc(mission.name)}</h3>
          ${cleared ? `<span class="chip chip--done">Concluída ${record.wins}×</span>` : ''}
        </div>
        <p class="mission-card__place">${esc(mission.place)}</p>
        <p class="mission-card__objective">${esc(mission.objective)}</p>
        <div class="mission-card__enemies">
          ${mission.enemies
            .map((entry) => {
              const character = getCharacter(entry.id);
              return `<span class="enemy-pill" title="${esc(character.name)} · Nv. ${entry.level}">
                ${character.sigil}<b>${entry.level}</b>
              </span>`;
            })
            .join('')}
          <span class="mission-card__count">${mission.enemies.length} inimigos</span>
        </div>
        <div class="mission-card__rewards">${rewardLine(mission.rewards)}</div>
      </div>
      <div class="mission-card__side">
        <span class="mission-card__req ${locked ? 'is-locked' : ''}">${locked ? `Requer Nv. ${mission.minLevel}` : `Nv. ${mission.minLevel}+`}</span>
        <button class="btn ${locked ? 'btn--ghost' : 'btn--primary'} btn--sm" data-brief="${mission.id}" type="button">
          ${locked ? 'Bloqueada' : cleared ? 'Repetir' : 'Briefing'}
        </button>
      </div>
    </article>
  `;
}

function openBriefing(missionId, navigate) {
  const mission = getMission(missionId);
  if (!mission) return;
  const rank = RANKS[mission.rank];
  const locked = game.level < mission.minLevel;
  const stamina = Math.floor(game.resourceSnapshot().stamina);
  const enoughStamina = stamina >= mission.stamina;

  const modal = shell.openModal({
    title: esc(mission.name),
    subtitle: `<span style="color:${rank.color}">${rank.label}</span> · ${esc(mission.place)}`,
    size: 'lg',
    className: 'modal--briefing',
    body: `
      <div class="briefing">
        <div class="briefing__story">
          ${mission.brief
            .map(
              (line) => `
              <div class="dialog__line">
                <span class="dialog__who">${esc(line.who)}</span>
                <p class="dialog__text">${esc(line.text)}</p>
              </div>`,
            )
            .join('')}
        </div>
        <div class="briefing__side">
          <div class="briefing__block">
            <span class="eyebrow">Força inimiga</span>
            <div class="briefing__enemies">
              ${mission.enemies
                .map((entry) => {
                  const character = getCharacter(entry.id);
                  return `
                    <div class="enemy-row">
                      ${sigilAvatar(character, { size: 'xs' })}
                      <div>
                        <strong>${esc(character.name)}</strong>
                        <small>${esc(character.title ?? '')} · Nv. ${entry.level}</small>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
          <div class="briefing__block">
            <span class="eyebrow">Recompensas</span>
            <div class="mission-card__rewards">${rewardLine(mission.rewards)}</div>
            <p class="briefing__note">A primeira vitória rende +50% de Ryos. Derrota não entrega recompensa.</p>
          </div>
          <div class="briefing__block briefing__block--cost">
            <span class="eyebrow">Custo de entrada</span>
            <strong class="${enoughStamina ? '' : 'is-danger'}">${mission.stamina} de stamina</strong>
            <small>Você tem ${stamina} disponível.</small>
          </div>
        </div>
      </div>
    `,
    actions: `
      <button class="btn btn--ghost" data-close="1" type="button">Voltar</button>
      <button class="btn btn--primary" data-fight type="button" ${locked || !enoughStamina ? 'disabled' : ''}>
        ${locked ? `Requer nível ${mission.minLevel}` : enoughStamina ? 'Entrar em combate' : 'Stamina insuficiente'}
      </button>
    `,
  });

  modal.querySelector('[data-fight]')?.addEventListener('click', () => {
    const started = game.startMission(mission);
    if (!started.ok) {
      shell.toast(started.reason, 'warn');
      return;
    }
    sfx.jutsu();
    shell.closeModal(modal);
    shell.refreshTopbar();
    navigate('batalha', { missionId: mission.id });
  });
}
