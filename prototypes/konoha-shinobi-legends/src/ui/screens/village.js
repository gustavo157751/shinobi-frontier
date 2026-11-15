/**
 * village.js — painel principal em Konoha: nível, equipe, treino e atalhos.
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
  const completed = Object.keys(state.missions).length;
  const colOpacity = Math.round((state.ninjas.length / ROSTER.length) * 100);

  container.innerHTML = `
    <section class="village">
      <div class="village__hero" style="background-image:url('/assets/village.webp')">
        <div class="village__veil"></div>
        <div class="village__hero-inner">
          <div class="village__greeting">
            <span class="eyebrow">Konoha · ${greeting()} </span>
            <h1>${state.stats.battles > 0 ? 'Bem-vindo de volta' : 'Bem-vindo'}, <em>${esc(state.player.name)}</em>.</h1>
            <p>
              ${hero.label ?? hero.title} · Nível ${state.player.level} · ${stats.hp} de vida ·
              ${state.stats.victories} vitórias registradas.
            </p>
          </div>

          <div class="level-card">
            <div class="level-card__top">
              <span class="level-card__badge">Nv. ${state.player.level}</span>
              <span class="level-card__exp">${state.player.exp} / ${expToNext(state.player.level)} EXP</span>
            </div>
            <div class="level-card__bar">
              <i style="width:${Math.min(100, (state.player.exp / expToNext(state.player.level)) * 100)}%"></i>
            </div>
            <p class="level-card__hint">Próximo nível: +vida máxima, +chakra e +stamina.</p>
          </div>
        </div>
      </div>

      <div class="village__grid">
        <div class="village__main">
          ${
            nextMission
              ? `
              <article class="next-mission" style="--rank-color:${RANKS[nextMission.rank].color}">
                <header class="next-mission__head">
                  <span class="rank-stamp">${nextMission.rank}</span>
                  <div>
                    <span class="eyebrow">Próxima missão sugerida</span>
                    <h2>${esc(nextMission.name)}</h2>
                    <p>${esc(nextMission.place)} · ${esc(nextMission.objective)}</p>
                  </div>
                </header>
                <div class="next-mission__foot">
                  <div class="next-mission__rewards">${rewardLine(nextMission.rewards)}</div>
                  <button class="btn btn--primary" data-next-mission="${nextMission.id}" type="button">
                    Abrir briefing
                  </button>
                </div>
              </article>
            `
              : `
              <article class="next-mission next-mission--done">
                <header class="next-mission__head">
                  <span class="rank-stamp">完</span>
                  <div>
                    <span class="eyebrow">Campanha concluída</span>
                    <h2>Konoha está em paz… por enquanto.</h2>
                    <p>Você venceu todas as missões disponíveis. Refaça as de Rank S para farmar Ouro e pergaminhos.</p>
                  </div>
                </header>
              </article>
            `
          }

          <section class="panel">
            <header class="panel__head">
              <div>
                <span class="eyebrow">Formação ativa</span>
                <h2>Sua equipe</h2>
              </div>
              <button class="btn btn--ghost btn--sm" data-nav="equipe" type="button">Gerenciar equipe</button>
            </header>
            <div class="squad-strip">
              ${game
                .squadCharacters()
                .map(
                  (character) => `
                  <button class="squad-chip" data-open-character="${character.id}" type="button">
                    ${sigilAvatar(character, { size: 'sm' })}
                    <span class="squad-chip__name">${esc(character.name)}</span>
                    <span class="squad-chip__meta">${character.isHero ? 'Protagonista' : `Nv. ${state.player.level}`}</span>
                  </button>
                `,
                )
                .join('')}
              ${Array.from({ length: Math.max(0, 5 - game.squadCharacters().length) })
                .map(() => '<div class="squad-chip squad-chip--empty"><span>+ vaga livre</span></div>')
                .join('')}
            </div>
            <p class="panel__note">
              Formação de até 5 combatentes: o protagonista é obrigatório e você pode escalar até 4 ninjas clássicos.
            </p>
          </section>

          <section class="panel">
            <header class="panel__head">
              <div>
                <span class="eyebrow">Mural de avisos</span>
                <h2>Do escritório da Hokage</h2>
              </div>
            </header>
            <div class="bounties">
              <div class="bounty">
                <span class="bounty__kanji">浮</span>
                <div>
                  <strong>Combo em cadeia</strong>
                  <p>Flutuação e Derrubar abrem perseguição automática. Monte a equipe com gatilhos diferentes para encadear mais golpes.</p>
                </div>
              </div>
              <div class="bounty">
                <span class="bounty__kanji">気</span>
                <div>
                  <strong>Gerencie o chakra</strong>
                  <p>Ataques básicos geram chakra; jutsus caros podem ficar sem energia. Alterne básicos e técnicas.</p>
                </div>
              </div>
              <div class="bounty">
                <span class="bounty__kanji">巻</span>
                <div>
                  <strong>Pergaminhos raros</strong>
                  <p>Missões Rank A e S rendem pergaminhos dourados, com chance de ninjas lendários.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="village__side">
          <section class="panel panel--compact">
            <header class="panel__head">
              <div>
                <span class="eyebrow">Entre missões</span>
                <h2>Ações da vila</h2>
              </div>
            </header>
            <div class="action-stack">
              <button class="action-card" id="action-train" type="button">
                <span class="action-card__kanji">修</span>
                <div>
                  <strong>Treinar</strong>
                  <p>Gasta ${TRAIN_COST} de chakra e concede EXP instantânea.</p>
                </div>
                <span class="action-card__cost">${TRAIN_COST} 気</span>
              </button>
              <button class="action-card" id="action-meditate" type="button">
                <span class="action-card__kanji">禅</span>
                <div>
                  <strong>Meditar</strong>
                  <p>Converte ${MEDITATE_COST} de chakra em +${MEDITATE_STAMINA} de stamina.</p>
                </div>
                <span class="action-card__cost">${MEDITATE_COST} 気</span>
              </button>
              <button class="action-card" data-nav="pergaminhos" type="button">
                <span class="action-card__kanji">召</span>
                <div>
                  <strong>Invocar ninja</strong>
                  <p>Use seus pergaminhos para desbloquear novos combatentes.</p>
                </div>
                <span class="action-card__cost">${state.scrolls.comum + state.scrolls.prata + state.scrolls.ouro} 巻</span>
              </button>
            </div>
          </section>

          <section class="panel panel--compact">
            <header class="panel__head">
              <div>
                <span class="eyebrow">Registro ninja</span>
                <h2>Progresso</h2>
              </div>
            </header>
            <dl class="stat-list">
              <div><dt>Missões concluídas</dt><dd>${completed} / ${MISSIONS.length}</dd></div>
              <div><dt>Batalhas</dt><dd>${state.stats.victories} / ${state.stats.battles}</dd></div>
              <div><dt>Perseguições</dt><dd>${state.stats.combos}</dd></div>
              <div><dt>Ninjas na equipe</dt><dd>${state.ninjas.length} / ${ROSTER.length}</dd></div>
            </dl>
            <div class="collection-bar" title="Coleção de ninjas">
              <i style="width:${colOpacity}%"></i>
              <span>${state.ninjas.length} de ${ROSTER.length} ninjas invocados</span>
            </div>
          </section>

          <section class="panel panel--compact panel--quote">
            <blockquote>
              “${esc(nextMission?.brief?.[0]?.text ?? 'Um ninja não mede força pela vitória, mas pelo que protege.')}”
            </blockquote>
            <cite>${esc(nextMission?.brief?.[0]?.who ?? 'Kakashi')}</cite>
          </section>
        </aside>
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

  container.querySelector('#action-train').addEventListener('click', () => {
    const result = game.train();
    if (!result.ok) {
      shell.toast(result.reason, 'warn');
      return;
    }
    sfx.levelUp();
    shell.refreshTopbar();
    shell.toast(`Treino concluído: +${result.exp} EXP`, 'success');
    if (result.leveledUp) shell.toast(`Nível ${result.newLevel}! Recursos restaurados.`, 'success');
    renderVillage(container, { navigate });
  });

  container.querySelector('#action-meditate').addEventListener('click', () => {
    const result = game.meditate();
    if (!result.ok) {
      shell.toast(result.reason, 'warn');
      return;
    }
    sfx.heal();
    shell.refreshTopbar();
    shell.toast(`Meditação: +${result.stamina} de stamina`, 'success');
    renderVillage(container, { navigate });
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'madrugada';
  if (hour < 12) return 'manhã';
  if (hour < 18) return 'tarde';
  return 'noite';
}
