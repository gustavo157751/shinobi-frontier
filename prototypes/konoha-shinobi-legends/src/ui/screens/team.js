/**
 * team.js — formação de combate, coleção de ninjas e ficha detalhada.
 */

import { ROSTER, getCharacter, statsFor, STYLES, ELEMENTS, RARITIES, BASIC_ATTACKS } from '../../data/characters.js';
import { jutsusOf } from '../../data/jutsus.js';
import { statusMeta } from '../../data/statuses.js';
import { game } from '../../core/state.js';
import { simulateCombo } from '../../core/combo-simulator.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, fmt } from '../../core/utils.js';
import { sigilAvatar, rosterCard, elementTag, styleTag, rarityTag } from '../components.js';
import { FORMATION_ROLES, formationBonuses, formationLane, roleFor } from '../../core/formation.js';

export function renderTeam(container, { characterId = null } = {}) {
  let selectedId = characterId && game.isOwned(characterId) ? characterId : 'hero';
  let moveModeId = null;
  let selectedJutsuId = null;

  function draw() {
    const squad = game.state.squad.filter((id) => game.isOwned(id));
    const selected = characterFor(selectedId);
    const members = squad.map((id) => ({
      id,
      character: characterFor(id),
      position: game.formationSlot(id) ?? 4,
      level: game.level,
    }));
    const formationBonus = formationBonuses(members);
    const basic = BASIC_ATTACKS[selected.style] ?? BASIC_ATTACKS.ninjutsu;
    const basicCombo = simulateCombo(members, selectedId, { name: basic.name, hits: 1, effect: basic.effect });
    const availableJutsus = jutsusOf(selected);
    const activeJutsu = availableJutsus.find((jutsu) => jutsu.id === selectedJutsuId) ?? availableJutsus[0];
    selectedJutsuId = activeJutsu?.id ?? null;
    const jutsuCombo = simulateCombo(members, selectedId, {
      name: activeJutsu?.name ?? 'Sem técnica',
      hits: activeJutsu?.hits ?? 1,
      effect: activeJutsu?.effect,
    });
    const bonusRows = [
      ['Vida máxima', formationBonus.hpPct, '%'],
      ['Chakra máximo', formationBonus.chakraPct, '%'],
      ['Ataques e combos', formationBonus.basicDamagePct, '%'],
      ['Técnicas', formationBonus.techniqueDamagePct, '%'],
      ['Redução de dano', formationBonus.damageReduction, '%'],
    ].filter(([, value]) => value > 0).map(([label, value]) =>
      `<span class="formation-bonus__chip">+${Math.round(value * 100)}% ${label}</span>`,
    );
    if (formationBonus.guardChakra > 0) {
      bonusRows.push(`<span class="formation-bonus__chip">+${formationBonus.guardChakra} chakra ao Guardar</span>`);
    }

    container.innerHTML = `
      <section class="team-screen">
        <header class="screen-head">
          <div>
            <span class="eyebrow">Escalação · Time 7 e aliados</span>
            <h1>Formação shinobi</h1>
            <p>Monte até 5 combatentes no tabuleiro 3×3. A coluna da direita é a linha de frente e muda foco de alvo, iniciativa e sinergias.</p>
          </div>
          <div class="screen-head__stats">
            <div><b>${squad.length}/5</b><span>Em campo</span></div>
            <div><b>${game.state.ninjas.length}/${ROSTER.length}</b><span>Coleção</span></div>
            <div><b>${game.level}</b><span>Nível</span></div>
          </div>
        </header>

        <div class="team-layout">
          <div class="team-col">
            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Vagas de combate</span>
                  <h2>Formação ativa</h2>
                </div>
                <span class="chip">${squad.length} de 5</span>
              </header>
              <div class="formation-board__caption">
                <span>Retaguarda</span><span>Meio</span><strong>Frente · inimigo →</strong>
              </div>
              <div class="formation-board" role="grid" aria-label="Grade tática 3 por 3">
                ${Array.from({ length: 9 })
                  .map((_, slot) => {
                    const id = squad.find((memberId) => game.formationSlot(memberId) === slot);
                    const lane = formationLane(slot);
                    const isMoving = moveModeId === selectedId && squad.includes(selectedId);
                    const isRecruitTarget = !squad.includes(selectedId) && game.isOwned(selectedId);
                    const isTarget = isMoving || (!id && isRecruitTarget);
                    if (!id) {
                      return `
                        <button class="formation-cell formation-cell--empty ${isTarget ? 'is-target' : ''}" data-formation-slot="${slot}" type="button"
                          aria-label="Posição ${slot + 1}, ${lane}${isTarget ? ', destino disponível' : ', vaga vazia'}">
                          <span class="formation-cell__index">P${String(slot + 1).padStart(2, '0')}</span>
                          <span class="formation-cell__lane">${lane}</span>
                          <b class="formation-cell__plus">+</b>
                          <small>${isMoving ? 'Mover selecionado' : isRecruitTarget ? 'Alocar selecionado' : 'Vaga livre'}</small>
                        </button>
                      `;
                    }
                    const character = characterFor(id);
                    const role = FORMATION_ROLES[roleFor(character)];
                    return `
                      <div class="formation-cell-wrap ${id === selectedId ? 'is-selected' : ''} ${isMoving && id !== selectedId ? 'is-target' : ''}">
                        <button class="formation-cell" data-formation-slot="${slot}" data-member-id="${id}" type="button"
                          aria-label="${esc(character.name)}, ${role.label}, ${lane}, posição ${slot + 1}">
                          <span class="formation-cell__index">P${String(slot + 1).padStart(2, '0')}</span>
                          ${sigilAvatar(character, { size: 'sm' })}
                          <strong>${esc(character.name)}</strong>
                          <small>${role.kanji} ${role.label}</small>
                          <em>${lane}</em>
                          ${id === 'hero' ? '<span class="formation-cell__fixed">Líder</span>' : ''}
                        </button>
                        ${id !== 'hero' ? `<button class="formation-cell__remove" data-remove="${id}" type="button" title="Remover da formação" aria-label="Remover ${esc(character.name)}">×</button>` : ''}
                      </div>
                    `;
                  })
                  .join('')}
              </div>
              <p class="formation-board__hint">Selecione um ninja para ver sua ficha. Use “Reposicionar” na ficha para trocar células; uma vaga vazia aloca o ninja selecionado.</p>
              <div class="formation-bonus">
                <div class="formation-bonus__head">
                  <strong>Sinergia da formação</strong>
                  <span>Bônus calculados pela função e coluna</span>
                </div>
                <div class="formation-bonus__chips">${bonusRows.join('') || '<span class="formation-bonus__empty">Nenhum bônus ativo</span>'}</div>
              </div>
              <p class="panel__note">
                Vanguarda fortalece a vida e protege a frente; Atacante amplia dano básico; Suporte melhora chakra/Guarda;
                Controle fortalece técnicas. As perseguições dependem dos gatilhos de Flutuação e Derrubar.
              </p>
            </section>

            <section class="panel combo-lab">
              <header class="panel__head">
                <div><span class="eyebrow">Planejamento tático</span><h2>Laboratório de combos</h2></div>
                <span class="chip">${squad.length}/5 no tabuleiro</span>
              </header>
              <p class="panel__note">Simulação das perseguições disponíveis para o ninja selecionado. A chance do efeito inicial não é alterada; o encadeamento presume que o gatilho aconteceu.</p>
              <div class="combo-lab__grid">
                ${comboPanelMarkup('Combo por Ataque', basicCombo)}
                <section class="combo-track">
                  <label class="combo-track__select">Combo por Técnica
                    <select data-combo-jutsu ${availableJutsus.length ? '' : 'disabled'}>
                      ${availableJutsus.map((jutsu) => `<option value="${jutsu.id}" ${jutsu.id === activeJutsu?.id ? 'selected' : ''}>${esc(jutsu.name)}</option>`).join('')}
                    </select>
                  </label>
                  ${comboStepsMarkup(jutsuCombo)}
                </section>
              </div>
            </section>

            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Coleção</span>
                  <h2>Ninjas desbloqueados</h2>
                </div>
                <span class="chip">${game.state.ninjas.length} invocados</span>
              </header>
              <div class="roster-grid">
                ${rosterCard(characterFor('hero'), {
                  owned: true,
                  level: game.level,
                  inSquad: squad.includes('hero'),
                  isHero: true,
                  stats: statsFor(game.hero, game.level),
                  selected: selectedId === 'hero',
                })}
                ${ROSTER.map((character) =>
                  rosterCard(character, {
                    owned: game.isOwned(character.id),
                    level: game.level,
                    inSquad: squad.includes(character.id),
                    stats: statsFor(character, game.level),
                    selected: selectedId === character.id,
                  }),
                ).join('')}
              </div>
            </section>
          </div>

          <aside class="detail-panel" id="detail-panel">${detailMarkup(selected, squad)}</aside>
        </div>
      </section>
    `;

    bind();
  }

  function bind() {
    container.querySelectorAll('[data-character]').forEach((card) => {
      card.addEventListener('click', () => {
        selectedId = card.dataset.character;
        moveModeId = null;
        sfx.click();
        draw();
      });
    });

    container.querySelectorAll('[data-formation-slot]').forEach((cell) => {
      cell.addEventListener('click', () => {
        const position = Number(cell.dataset.formationSlot);
        const squad = game.state.squad;
        if (moveModeId === selectedId && squad.includes(selectedId)) {
          const result = game.placeSquadMember(selectedId, position);
          if (!result.ok) {
            shell.toast(result.reason, 'warn');
            return;
          }
          moveModeId = null;
          sfx.click();
          shell.toast(result.action === 'swapped' ? 'Posições trocadas.' : 'Integrante reposicionado.');
          draw();
          return;
        }

        const memberId = cell.dataset.memberId;
        if (memberId) {
          selectedId = memberId;
          moveModeId = null;
          draw();
          return;
        }
        if (squad.includes(selectedId)) {
          shell.toast('Abra a ficha do integrante e escolha “Reposicionar” para mover uma unidade.');
          return;
        }
        const result = game.addSquadMemberAt(selectedId, position);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(`${characterFor(selectedId).name} ocupou a posição ${position + 1}.`);
        draw();
      });
    });

    container.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const id = button.dataset.remove;
        const result = game.toggleSquadMember(id);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(`${characterFor(id).name} saiu da formação.`);
        draw();
      });
    });

    container.querySelector('[data-combo-jutsu]')?.addEventListener('change', (event) => {
      selectedJutsuId = event.currentTarget.value;
      draw();
    });

    bindDetail();
  }

  function bindDetail() {
    const action = container.querySelector('[data-squad-action]');
    if (action) {
      action.addEventListener('click', () => {
        const id = action.dataset.squadAction;
        const result = game.toggleSquadMember(id);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(result.action === 'added' ? `${characterFor(id).name} entrou na formação!` : `${characterFor(id).name} saiu da formação.`);
        draw();
      });
    }

    container.querySelector('[data-move-mode]')?.addEventListener('click', () => {
      moveModeId = moveModeId === selectedId ? null : selectedId;
      draw();
    });

    container.querySelector('[data-open-jutsus]')?.addEventListener('click', () => openJutsuModal(selectedId));
  }

  function characterFor(id) {
    if (id === 'hero') {
      return { ...game.hero, name: game.state.player.name, rarity: 'lendario', id: 'hero', isHero: true };
    }
    return getCharacter(id);
  }

  draw();

  function detailMarkup(character, squad) {
    if (!character) return '';
    const isHero = character.id === 'hero' || character.isHero;
    const owned = game.isOwned(character.id);
    const inSquad = squad.includes(character.id);
    const stats = statsFor(isHero ? game.hero : character, game.level);
    const style = STYLES[character.style] ?? STYLES.ninjutsu;
    const element = ELEMENTS[character.element] ?? ELEMENTS.vento;
    const jutsus = jutsusOf(isHero ? game.hero : character);

    return `
      <div class="detail" style="--detail-color:${style.color}">
        <div class="detail__head">
          ${sigilAvatar(character, { size: 'xl' })}
          <div>
            <span class="eyebrow">${isHero ? 'Protagonista' : RARITIES[character.rarity]?.label ?? 'Ninja'}</span>
            <h2>${esc(character.name)}</h2>
            <p>${esc(character.title ?? '')}</p>
            <div class="detail__tags">
              ${styleTag(character.style)}
              ${elementTag(character.element)}
              ${isHero ? '' : rarityTag(character.rarity)}
            </div>
          </div>
        </div>

        <div class="detail__stats">
          <div><span>Vida</span><b>${fmt(stats.hp)}</b></div>
          <div><span>Ataque</span><b>${fmt(stats.atk)}</b></div>
          <div><span>Defesa</span><b>${fmt(stats.def)}</b></div>
          <div><span>Velocidade</span><b>${stats.spd}</b></div>
          <div><span>Chakra</span><b>${stats.chakraMax}</b></div>
          <div><span>Crítico</span><b>${Math.round(stats.crit * 100)}%</b></div>
        </div>

        <div class="detail__section">
          <h3>Técnicas</h3>
          <ul class="jutsu-list">
            ${jutsus
              .map(
                (jutsu) => `
                <li class="jutsu-item">
                  <span class="jutsu-item__kanji">${jutsu.kanji}</span>
                  <div>
                    <strong>${esc(jutsu.name)}</strong>
                    <p>${esc(jutsu.desc)}</p>
                    <span class="jutsu-item__meta">
                      ${jutsu.cost} chakra · ${jutsu.target === 'allEnemies' ? 'área' : jutsu.target === 'ally' || jutsu.target === 'allAllies' ? 'suporte' : 'alvo único'}
                      ${jutsu.power ? ` · poder ${jutsu.power}x` : ''}
                    </span>
                  </div>
                </li>`,
              )
              .join('')}
          </ul>
        </div>

        ${
          character.pursuit
            ? `
            <div class="detail__section">
              <h3>Perseguição (combo)</h3>
              <div class="pursuit">
                <span class="pursuit__kanji">追</span>
                <div>
                  <strong>${esc(character.pursuit.name)}</strong>
                  <p>Dispara quando o alvo recebe
                    ${character.pursuit.triggers.map((trigger) => `<b>${trigger === 'float' ? 'Flutuação' : 'Derrubar'}</b>`).join(' ou ')}.
                    Dano de ${character.pursuit.mult}x${character.pursuit.hits ? ` em ${character.pursuit.hits} golpe(s)` : ''}.
                  </p>
                </div>
              </div>
            </div>`
            : ''
        }

        ${
          character.passive
            ? `<div class="detail__section"><h3>Passiva</h3><p class="detail__passive">${esc(character.passive)}</p></div>`
            : ''
        }

        <blockquote class="detail__quote">“${esc(character.quote ?? 'A vila conta comigo.')}”</blockquote>

        <div class="detail__actions">
          ${
            owned
              ? `<button class="btn ${inSquad ? 'btn--ghost' : 'btn--primary'} btn--block" data-squad-action="${character.id}" type="button"
                   ${isHero ? 'disabled title="O protagonista é obrigatório"' : ''}>
                   ${isHero ? 'Sempre em campo' : inSquad ? 'Remover da formação' : 'Escalar na formação'}
                 </button>`
              : `<button class="btn btn--primary btn--block" disabled type="button">Invoque com um pergaminho</button>`
          }
          ${inSquad ? '<button class="btn btn--ghost btn--block" data-move-mode type="button">Reposicionar na grade</button>' : ''}
          <button class="btn btn--ghost btn--block" data-open-jutsus="1" type="button">Ver ficha completa de combate</button>
        </div>
      </div>
    `;
  }

  function openJutsuModal(id) {
    const character = characterFor(id);
    const isHero = character.id === 'hero' || character.isHero;
    const jutsus = jutsusOf(isHero ? game.hero : character);
    const pursuit = character.pursuit;
    shell.openModal({
      title: esc(character.name),
      subtitle: `${STYLES[character.style].label} · ${ELEMENTS[character.element].label}`,
      size: 'md',
      body: `
        <div class="jutsu-sheet">
          <div class="jutsu-sheet__intro">
            ${sigilAvatar(character, { size: 'lg' })}
            <p>${esc(character.title ?? '')}. Atributos calculados no nível ${game.level}.</p>
          </div>
          <ul class="jutsu-list">
            ${jutsus
              .map(
                (jutsu) => `
                <li class="jutsu-item">
                  <span class="jutsu-item__kanji">${jutsu.kanji}</span>
                  <div>
                    <strong>${esc(jutsu.name)}</strong>
                    <p>${esc(jutsu.desc)}</p>
                    <span class="jutsu-item__meta">${jutsu.cost} chakra${jutsu.power ? ` · poder ${jutsu.power}x` : ''}${jutsu.hits > 1 ? ` · ${jutsu.hits} golpes` : ''}</span>
                  </div>
                </li>`,
              )
              .join('')}
          </ul>
          ${
            pursuit
              ? `<div class="pursuit pursuit--wide">
                   <span class="pursuit__kanji">追</span>
                   <div>
                     <strong>${esc(pursuit.name)}</strong>
                     <p>Gatilhos: ${pursuit.triggers.map((trigger) => (trigger === 'float' ? 'Flutuação' : 'Derrubar')).join(', ')} · dano ${pursuit.mult}x.</p>
                   </div>
                 </div>`
              : ''
          }
        </div>
      `,
    });
  }
}

function comboPanelMarkup(title, combo) {
  return `
    <section class="combo-track">
      <h3>${title}</h3>
      ${comboStepsMarkup(combo)}
    </section>
  `;
}

function comboStepsMarkup(combo) {
  const trigger = combo.triggerType ? statusMeta(combo.triggerType) : null;
  const starter = `
    <li class="combo-step combo-step--starter">
      <span class="combo-step__number">1</span>
      <span><strong>${esc(combo.sourceName)}</strong><small>${esc(combo.starterName)} · ${combo.starterHits} ${combo.starterHits === 1 ? 'acerto' : 'acertos'}</small></span>
    </li>
  `;
  const pursuits = combo.sequence.map((step, index) => `
    <li class="combo-step">
      <span class="combo-step__number">${index + 2}</span>
      <span><strong>${esc(step.name)}</strong><small>${esc(step.ability)} · ${step.hits} ${step.hits === 1 ? 'acerto' : 'acertos'} · ${statusMeta(step.triggerType).label}</small></span>
    </li>
  `).join('');
  const emptyMessage = !combo.triggerType
    ? 'Esta ação não aplica um efeito de perseguição.'
    : !trigger?.combo
      ? `${trigger?.label ?? 'O efeito'} não abre perseguição neste protótipo.`
      : 'Nenhum aliado disponível possui perseguição para este gatilho.';
  return `
    <div class="combo-track__meta">
      <span>${trigger ? `Gatilho: ${trigger.label}` : 'Sem gatilho de combo'}</span>
      <span>${combo.sequence.length} ${combo.sequence.length === 1 ? 'perseguição' : 'perseguições'}</span>
    </div>
    <ol class="combo-sequence">${starter}${pursuits || `<li class="combo-track__empty">${emptyMessage}</li>`}</ol>
    <div class="combo-track__total"><b>${combo.totalHits}</b><span>acertos na sequência</span></div>
  `;
}
