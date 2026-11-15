/**
 * battle.js — tela de combate: arena, painel de ações, combos e resultado.
 */

import { Battle } from '../../core/combat.js';
import { game, enemyUnitsFor } from '../../core/state.js';
import { getMission, RANKS } from '../../data/missions.js';
import { BASIC_ATTACKS, STYLES } from '../../data/characters.js';
import { jutsusOf } from '../../data/jutsus.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, sleep } from '../../core/utils.js';
import { battleCard, rewardLine } from '../components.js';

export async function renderBattle(container, { missionId, navigate }) {
  const mission = getMission(missionId);
  if (!mission) {
    navigate('missoes');
    return;
  }

  const allies = game.squadUnits();
  const enemies = enemyUnitsFor(mission);
  const rank = RANKS[mission.rank];

  container.innerHTML = `
    <section class="battle-screen" style="--rank-color:${rank.color}">
      <div class="battle-bg" style="background-image:url('/assets/arena.webp')"></div>
      <div class="battle-bg__veil"></div>

      <header class="battle-head">
        <button class="battle-head__back" id="battle-flee" type="button">‹ Recuar</button>
        <div class="battle-head__mission">
          <span class="rank-stamp rank-stamp--sm">${mission.rank}</span>
          <div>
            <strong>${esc(mission.name)}</strong>
            <small>${esc(mission.place)}</small>
          </div>
        </div>
        <div class="battle-head__round"><span>Rodada</span><b id="round-value">1</b></div>
        <div class="battle-head__combo"><span>Combo</span><b id="combo-value">0</b></div>
        <div class="battle-head__speed" id="speed-toggle-wrap">
          <button class="icon-btn" id="speed-toggle" type="button" title="Acelerar animações">»</button>
        </div>
      </header>

      <div class="battle-stage" id="battle-stage">
        <div class="team-row team-row--enemy" id="enemy-row"></div>
        <div class="stage-mid"><span></span><b>対</b><span></span></div>
        <div class="team-row team-row--ally" id="ally-row"></div>
        <div class="fx-layer" id="fx-layer"></div>
        <div class="battle-banner" id="battle-banner"></div>
        <div class="combo-banner" id="combo-banner"></div>
      </div>

      <footer class="battle-foot">
        <div class="turn-console" id="turn-console">
          <span class="turn-console__hint">A batalha vai começar…</span>
        </div>
        <div class="battle-log" id="battle-log">
          <header class="battle-log__head">Registro de combate</header>
          <div class="battle-log__body" id="battle-log-body"></div>
        </div>
      </footer>
    </section>
  `;

  const stageEl = container.querySelector('#battle-stage');
  const enemyRow = container.querySelector('#enemy-row');
  const allyRow = container.querySelector('#ally-row');
  const fxLayer = container.querySelector('#fx-layer');
  const bannerEl = container.querySelector('#battle-banner');
  const comboEl = container.querySelector('#combo-banner');
  const consoleEl = container.querySelector('#turn-console');
  const logBody = container.querySelector('#battle-log-body');
  const roundValue = container.querySelector('#round-value');
  const comboValue = container.querySelector('#combo-value');

  let speed = 1;
  const wait = (ms) => sleep(Math.round(ms / speed));
  let activeUid = null;
  let selectedTarget = null;
  let resolving = null;
  let choosingAlly = null;
  let battleRef = null;

  container.querySelector('#speed-toggle').addEventListener('click', (event) => {
    speed = speed === 1 ? 2 : 1;
    event.currentTarget.classList.toggle('is-active', speed === 2);
    shell.toast(speed === 2 ? 'Combate acelerado' : 'Velocidade normal');
  });

  /* ------------------------------- render ------------------------------- */

  function renderBoard() {
    enemyRow.innerHTML = enemies.map((unit) => battleCard(unit, { selected: selectedTarget === unit.uid })).join('');
    allyRow.innerHTML = allies.map((unit) => battleCard(unit, { selected: selectedTarget === unit.uid })).join('');
    updateActive();
    updateCounters();
    bindTargets();
  }

  function updateActive() {
    container.querySelectorAll('.unit').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.uid === activeUid);
    });
  }

  function updateCounters() {
    roundValue.textContent = battleRef?.round ?? 1;
    comboValue.textContent = battleRef?.comboCount ?? 0;
  }

  function bindTargets() {
    container.querySelectorAll('.unit').forEach((el) => {
      el.addEventListener('click', () => {
        const unit = battleRef?.unitByUid(el.dataset.uid);
        if (!unit?.alive) return;
        if (choosingAlly) {
          if (unit.side === 'ally') resolveAction({ type: 'jutsu', jutsuId: choosingAlly.id, targetUid: unit.uid });
          else shell.toast('Escolha um aliado para a técnica.', 'warn');
          return;
        }
        if (unit.side === 'enemy' && resolving) {
          selectedTarget = unit.uid;
          sfx.click();
          renderBoard();
        } else if (unit.side === 'ally' && resolving) {
          shell.toast('Seu ataque mira nos inimigos.', 'warn');
        } else {
          showUnitInfo(unit);
        }
      });
    });
  }

  function showUnitInfo(unit) {
    if (resolving) return;
    shell.openModal({
      title: esc(unit.name),
      subtitle: `${esc(unit.def.title ?? '')} · Nível ${unit.level}`,
      size: 'sm',
      body: `
        <div class="unit-info">
          <div class="unit-info__bars">
            <span>Vida <b>${Math.round(unit.hp)} / ${unit.maxHp}</b></span>
            <span>Chakra <b>${Math.round(unit.chakra)} / ${unit.maxChakra}</b></span>
            <span>Ataque <b>${unit.atk}</b></span>
            <span>Defesa <b>${unit.defense}</b></span>
            <span>Velocidade <b>${unit.spd}</b></span>
            <span>Crítico <b>${Math.round(unit.crit * 100)}%</b></span>
          </div>
          <p class="unit-info__passive">${esc(unit.def.passive ?? 'Sem passiva registrada.')}</p>
        </div>
      `,
    });
  }

  /* -------------------------------- efeitos ------------------------------ */

  function unitRect(uid) {
    const el = stageEl.querySelector(`.unit[data-uid="${uid}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const base = stageEl.getBoundingClientRect();
    return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top - 2 };
  }

  function floatText(uid, text, kind = 'dmg', offset = 0) {
    const pos = unitRect(uid);
    if (!pos) return;
    const span = document.createElement('span');
    span.className = `float-text float-text--${kind}`;
    span.textContent = text;
    span.style.left = `${pos.x}px`;
    span.style.top = `${pos.y + offset}px`;
    fxLayer.appendChild(span);
    setTimeout(() => span.remove(), 1100);
  }

  function flashUnit(uid, className = 'is-hit') {
    const el = stageEl.querySelector(`.unit[data-uid="${uid}"]`);
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 520);
  }

  function showBanner(title, subtitle = '', duration = 700) {
    bannerEl.innerHTML = `<strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}`;
    bannerEl.classList.add('is-visible');
    setTimeout(() => bannerEl.classList.remove('is-visible'), duration);
  }

  function showComboBanner(count, attacker, name) {
    comboEl.innerHTML = `
      <span class="combo-banner__count">x${count}</span>
      <span class="combo-banner__info"><b>${esc(attacker)}</b><small>${esc(name)}</small></span>
    `;
    comboEl.classList.remove('is-visible');
    void comboEl.offsetWidth;
    comboEl.classList.add('is-visible');
    setTimeout(() => comboEl.classList.remove('is-visible'), 1200);
  }

  function addLog(text, kind = 'info') {
    const entry = document.createElement('p');
    entry.className = `log-line log-line--${kind}`;
    entry.textContent = text;
    logBody.prepend(entry);
    while (logBody.children.length > 40) logBody.lastElementChild.remove();
  }

  /* ------------------------------ console -------------------------------- */

  function renderConsole(unit) {
    if (!unit) {
      consoleEl.innerHTML = '<span class="turn-console__hint">Turno dos inimigos…</span>';
      return;
    }
    const basic = BASIC_ATTACKS[unit.style] ?? BASIC_ATTACKS.ninjutsu;
    const jutsus = jutsusOf(unit.def);
    const style = STYLES[unit.style] ?? STYLES.ninjutsu;
    const guardGain = 28 + (unit.teamBonus?.guardChakra ?? 0);
    consoleEl.innerHTML = `
      <div class="turn-console__turn" style="--turn-color:${style.color}">
        <span class="turn-console__avatar">${unit.sigil}</span>
        <div>
          <span class="eyebrow">Sua vez</span>
          <strong>${esc(unit.name)}</strong>
        </div>
        <div class="turn-console__chakra">
          <span>Chakra</span>
          <b>${Math.round(unit.chakra)}/${unit.maxChakra}</b>
          <i><b style="width:${(unit.chakra / unit.maxChakra) * 100}%"></b></i>
        </div>
      </div>
      <div class="turn-console__actions">
        <button class="act act--basic" data-action="basic" type="button">
          <span class="act__kanji">${basic.kanji}</span>
          <span class="act__body"><strong>${basic.name}</strong><small>+${basic.chakraGain} chakra</small></span>
        </button>
        ${jutsus
          .map((jutsu) => {
            const cost = unit.charId === 'jiraiya' ? Math.max(10, jutsu.cost - 5) : jutsu.cost;
            const disabled = unit.chakra < cost;
            return `
              <button class="act act--jutsu ${disabled ? 'is-disabled' : ''}" data-jutsu="${jutsu.id}" type="button" ${disabled ? 'disabled' : ''}>
                <span class="act__kanji">${jutsu.kanji}</span>
                <span class="act__body"><strong>${esc(jutsu.name)}</strong><small>${cost} chakra${jutsu.target === 'allEnemies' ? ' · área' : jutsu.target === 'ally' || jutsu.target === 'allAllies' ? ' · suporte' : ''}</small></span>
              </button>
            `;
          })
          .join('')}
        <button class="act act--guard" data-action="guard" type="button">
          <span class="act__kanji">守</span>
          <span class="act__body"><strong>Guardar</strong><small>−50% dano · +${guardGain} chakra</small></span>
        </button>
      </div>
      <p class="turn-console__hint" id="target-hint"></p>
    `;

    consoleEl.querySelector('[data-action="basic"]').addEventListener('click', () => {
      resolveAction({ type: 'basic', targetUid: selectedTarget });
    });
    consoleEl.querySelectorAll('[data-jutsu]').forEach((button) => {
      button.addEventListener('click', () => {
        const jutsu = jutsus.find((item) => item.id === button.dataset.jutsu);
        if (!jutsu) return;
        if (jutsu.target === 'ally') {
          choosingAlly = jutsu;
          updateTargetHint(`Escolha um aliado para ${jutsu.name}.`);
          return;
        }
        resolveAction({ type: 'jutsu', jutsuId: jutsu.id, targetUid: selectedTarget });
      });
    });
    consoleEl.querySelector('[data-action="guard"]').addEventListener('click', () => {
      resolveAction({ type: 'guard' });
    });
    updateTargetHint();
  }

  function updateTargetHint(message = '') {
    const hint = consoleEl.querySelector('#target-hint');
    if (!hint) return;
    if (message) {
      hint.innerHTML = `${esc(message)} <button class="link-btn" id="cancel-ally" type="button">cancelar</button>`;
      hint.querySelector('#cancel-ally').addEventListener('click', () => {
        choosingAlly = null;
        updateTargetHint();
      });
      return;
    }
    const target = battleRef?.unitByUid(selectedTarget);
    hint.textContent = target ? `Alvo atual: ${target.name}. Clique em outro inimigo para trocar.` : 'Escolha um inimigo clicando na ficha dele.';
  }

  function resolveAction(action) {
    if (!resolving) return;
    const resolve = resolving;
    resolving = null;
    choosingAlly = null;
    consoleEl.innerHTML = '<span class="turn-console__hint">Resolvendo ação…</span>';
    resolve(action);
  }

  /* -------------------------------- hooks -------------------------------- */

  const hooks = {
    render: () => renderBoard(),
    log: (text, kind) => addLog(text, kind),
    highlight: async (uid) => {
      activeUid = uid;
      updateActive();
      await wait(90);
    },
    askAction: (unit) =>
      new Promise((resolve) => {
        activeUid = unit.uid;
        resolving = resolve;
        selectedTarget = selectedTarget && battleRef.unitByUid(selectedTarget)?.alive
          ? selectedTarget
          : (enemies.find((enemy) => enemy.alive)?.uid ?? null);
        renderBoard();
        renderConsole(unit);
      }),
    actionFlash: async (unit, label) => {
      activeUid = unit.uid;
      updateActive();
      floatText(unit.uid, label, 'action', -26);
      if (unit.side === 'enemy') sfx.jutsu();
      await wait(520);
    },
    hit: async (target, info) => {
      renderBoard();
      if (info.kind === 'dot' || info.kind === 'recoil') {
        floatText(target.uid, `-${info.amount}`, 'dot');
      } else if (info.crit) {
        sfx.crit();
        floatText(target.uid, `CRÍTICO -${info.amount}`, 'crit');
      } else if (info.kind === 'combo') {
        floatText(target.uid, `-${info.amount}`, 'combo');
      } else {
        sfx.hit();
        floatText(target.uid, `-${info.amount}`, 'dmg');
      }
      if (info.absorbed) floatText(target.uid, `barreira ${info.absorbed}`, 'shield', 30);
      flashUnit(target.uid, info.crit ? 'is-crit' : 'is-hit');
      renderBoard();
      await wait(info.kind === 'combo' ? 280 : 400);
    },
    heal: async (target, amount) => {
      renderBoard();
      sfx.heal();
      floatText(target.uid, `+${amount}`, 'heal');
      flashUnit(target.uid, 'is-heal');
      await wait(320);
    },
    statusApplied: async (target, meta) => {
      floatText(target.uid, `${meta.kanji} ${meta.label}`, 'status', 34);
      await wait(240);
    },
    combo: async ({ count, attacker, name }) => {
      showComboBanner(count, attacker.name, name);
      sfx.combo();
      updateCounters();
      await wait(520);
    },
    defeat: async (unit) => {
      renderBoard();
      flashUnit(unit.uid, 'is-dead');
      await wait(360);
    },
    message: async (title, subtitle) => {
      showBanner(title, subtitle, 900);
      if (title.startsWith('RODADA')) updateCounters();
      await wait(title.startsWith('BATALHA') ? 500 : 760);
    },
    settle: async () => {
      await wait(160);
    },
    trackDamage: (amount) => game.registerDamage(amount),
  };

  renderBoard();
  const battle = new Battle({ allies, enemies, hooks });
  battleRef = battle;

  container.querySelector('#battle-flee').addEventListener('click', async () => {
    const ok = await shell.confirm({
      title: 'Recuar da missão?',
      text: 'A stamina usada nesta missão não volta e nenhuma recompensa será entregue.',
      confirmLabel: 'Recuar',
      danger: true,
    });
    if (!ok) return;
    battle.flee();
    if (resolving) resolveAction({ type: 'guard' });
  });

  const outcome = await battle.start();

  if (outcome.victory) {
    sfx.victory();
    showBanner('VITÓRIA', 'Missão cumprida', 1400);
  } else {
    sfx.defeat();
    showBanner(outcome.fled ? 'RECUO' : 'DERROTA', outcome.fled ? 'A equipe saiu de campo' : 'A equipe foi nocauteada', 1400);
  }
  game.registerCombo(outcome.combos);
  const result = game.finishMission(mission, { victory: outcome.victory, rounds: outcome.rounds });
  shell.refreshTopbar();
  await wait(700);
  showResult(outcome, result, mission, navigate);
}

function showResult(outcome, result, mission, navigate) {
  const victory = outcome.victory;
  const rewards = result.rewards;
  const levelResult = result.levelResult;
  const modal = shell.openModal({
    title: victory ? 'Missão cumprida' : outcome.fled ? 'Recuo registrado' : 'Equipe derrotada',
    subtitle: `${RANKS[mission.rank].label} · ${esc(mission.name)}`,
    size: 'md',
    className: `modal--result ${victory ? 'is-victory' : 'is-defeat'}`,
    dismissable: false,
    body: `
      <div class="result">
        <div class="result__stamp">${victory ? '勝' : outcome.fled ? '退' : '敗'}</div>
        <div class="result__body">
          <p class="result__lead">
            ${
              victory
                ? `A equipe venceu em ${outcome.rounds} ${outcome.rounds === 1 ? 'rodada' : 'rodadas'} com ${outcome.combos} ${outcome.combos === 1 ? 'perseguição encadeada' : 'perseguições encadeadas'}.${outcome.bestCombo > 1 ? ` Melhor combo: x${outcome.bestCombo}.` : ''}`
                : outcome.fled
                  ? 'Vocês deixaram o campo. A stamina foi consumida, mas a equipe está a salvo.'
                  : 'A equipe foi nocauteada. Treine, ajuste a formação e tente novamente.'
            }
          </p>
          ${
            victory && rewards
              ? `<div class="result__rewards">
                   <span class="eyebrow">Recompensas</span>
                   <div class="mission-card__rewards">${rewardLine(rewards)}</div>
                   ${result.firstClear ? '<p class="result__bonus">Primeira vitória: +50% de Ryos!</p>' : ''}
                 </div>`
              : ''
          }
          ${
            levelResult?.leveledUp
              ? `<div class="result__levelup">
                   <strong>Nível ${levelResult.newLevel}!</strong>
                   <span>Vida, chakra e stamina máximos aumentaram e foram restaurados.</span>
                 </div>`
              : ''
          }
          <p class="result__note">${
            victory ? 'Refaça missões para farmar Ryos, EXP e pergaminhos.' : 'Dica: use Guardar para acumular chakra antes de um jutsu decisivo.'
          }</p>
        </div>
      </div>
    `,
    actions: `
      <button class="btn btn--ghost" data-home type="button">Voltar à vila</button>
      <button class="btn btn--primary" data-again type="button">Tentar novamente</button>
    `,
  });

  modal.querySelector('[data-home]').addEventListener('click', () => {
    shell.closeModal(modal);
    navigate('vila');
  });

  modal.querySelector('[data-again]').addEventListener('click', () => {
    const started = game.startMission(mission);
    if (!started.ok) {
      shell.toast(started.reason, 'warn');
      return;
    }
    shell.closeModal(modal);
    shell.refreshTopbar();
    navigate('batalha', { missionId: mission.id, nonce: Date.now() });
  });
}
