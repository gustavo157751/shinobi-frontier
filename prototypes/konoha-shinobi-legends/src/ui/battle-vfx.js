/**
 * battle-vfx.js — efeitos de combate leves, feitos em DOM/CSS e sem assets externos.
 * Os temas seguem o elemento do ninja; movimentos, áreas e suporte são diferenciados
 * pelo tipo da ação recebido do motor de combate.
 */

const ELEMENT_THEMES = Object.freeze({
  fogo: 'fire',
  vento: 'wind',
  raio: 'lightning',
  terra: 'earth',
  agua: 'water',
  gelo: 'ice',
  yin: 'yin',
});

export function vfxThemeFor(element) {
  return ELEMENT_THEMES[element] ?? 'chakra';
}

export function vfxKindFor(type, { support = false } = {}) {
  if (type === 'pursuit') return 'pursuit';
  if (type === 'guard') return 'guard';
  if (type === 'jutsu' && support) return 'support';
  if (type === 'jutsu') return 'jutsu';
  return 'basic';
}

export function createBattleVfx({ stageEl, fxLayer, getBattle }) {
  function unitElement(uid) {
    return [...stageEl.querySelectorAll('.unit')].find((node) => node.dataset.uid === uid) ?? null;
  }

  function pointFor(uid, { lift = 0 } = {}) {
    const node = unitElement(uid);
    if (!node) return null;
    // Mira no selo quando visível; se ele some em mobile, sobe no cabeçalho
    // para que o raio do impacto não invada as barras de HP/chakra.
    const sigil = node.querySelector('.unit__sigil');
    const sigilRect = sigil?.getBoundingClientRect();
    const hasVisibleSigil = sigilRect?.width > 0 && sigilRect?.height > 0;
    const rect = hasVisibleSigil
      ? sigilRect
      : (node.querySelector('.unit__head') ?? node).getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const stage = stageEl.getBoundingClientRect();
    // Em mobile, uma folga fixa resiste à escala do cartão; no desktop, `lift`
    // reserva espaço acima dos indicadores para o tamanho máximo das auras.
    const verticalClearance = hasVisibleSigil ? lift : 14;
    return {
      x: rect.left - stage.left + rect.width / 2,
      y: rect.top - stage.top + rect.height / 2 - verticalClearance,
    };
  }

  function spawn(className, point, {
    duration = 420,
    delay = 0,
    dx = 0,
    dy = 0,
    midDx = dx * 0.82,
    midDy = dy * 0.82,
    angle = 0,
    color = null,
  } = {}) {
    if (!point) return null;
    const node = document.createElement('span');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    node.style.left = `${point.x}px`;
    node.style.top = `${point.y}px`;
    node.style.setProperty('--dx', `${dx}px`);
    node.style.setProperty('--dy', `${dy}px`);
    node.style.setProperty('--mid-dx', `${midDx}px`);
    node.style.setProperty('--mid-dy', `${midDy}px`);
    node.style.setProperty('--angle', `${angle}deg`);
    node.style.setProperty('--travel-ms', `${duration}ms`);
    node.style.setProperty('--delay-ms', `${delay}ms`);
    if (color) node.style.setProperty('--vfx-color', color);
    fxLayer.appendChild(node);
    window.setTimeout(() => node.remove(), duration + delay + 140);
    return node;
  }

  function targetsFor(unit, { targetMode, targetUid } = {}) {
    const battle = getBattle();
    if (!battle) return [];
    if (targetMode === 'allEnemies') return battle.enemiesOf(unit);
    if (targetMode === 'allAllies') return battle.alliesOf(unit);
    if (targetMode === 'self') return [unit];
    if (targetMode === 'ally') {
      const selected = targetUid ? battle.unitByUid(targetUid) : null;
      return [selected?.side === unit.side ? selected : battle.allyTarget(unit, null)].filter(Boolean);
    }
    const selected = targetUid ? battle.unitByUid(targetUid) : null;
    if (selected?.alive && selected.side !== unit.side) return [selected];
    const fallback = battle.unitByUid(battle.defaultTargetUid(unit));
    return fallback ? [fallback] : [];
  }

  function impactAt(point, kind, theme, duration = 440, color = null) {
    return spawn(
      `battle-impact battle-impact--${kind} battle-vfx--${theme}`,
      point,
      { duration, color },
    );
  }

  function action(unit, meta = {}) {
    const type = meta.type ?? 'basic';
    const kind = vfxKindFor(type, { support: meta.support });
    const theme = vfxThemeFor(meta.element ?? unit.element);
    const durationScale = meta.durationScale ?? 1;
    const targets = targetsFor(unit, meta).filter((target) => target.alive);
    const origin = pointFor(unit.uid);

    if (kind === 'guard' || kind === 'support') {
      const duration = Math.round((kind === 'guard' ? 620 : 700) * durationScale);
      for (const target of targets) {
        impactAt(pointFor(target.uid, { lift: 10 }), kind, theme, duration);
      }
      return Math.round((kind === 'guard' ? 260 : 310) * durationScale);
    }

    if (!origin || !targets.length) return Math.round(220 * durationScale);
    const travel = Math.round((kind === 'jutsu' ? 390 : kind === 'pursuit' ? 300 : 250) * durationScale);
    const cast = type === 'jutsu' || type === 'pursuit';
    if (cast) {
      impactAt(pointFor(unit.uid, { lift: 10 }), 'cast', theme, Math.round(470 * durationScale));
    }

    targets.forEach((target, index) => {
      const destination = pointFor(target.uid);
      if (!destination) return;
      const dx = destination.x - origin.x;
      const dy = destination.y - origin.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const aoe = meta.targetMode === 'allEnemies' || meta.targetMode === 'allAllies';
      const damageInterval = Math.max(1, meta.hits ?? 1) * 400;
      const stagger = aoe && !meta.support ? damageInterval : 65;
      spawn(
        `battle-vfx battle-vfx--projectile battle-vfx--${kind} battle-vfx--${theme}${aoe ? ' battle-vfx--area' : ''}`,
        origin,
        {
          duration: travel,
          delay: Math.round(index * stagger * durationScale),
          dx,
          dy,
          midDx: dx * 0.82,
          midDy: dy * 0.82,
          angle,
        },
      );
    });
    return travel;
  }

  function impact(target, info = {}) {
    const theme = info.kind === 'dot' ? 'fire' : vfxThemeFor(info.sourceElement);
    const kind = info.kind === 'combo' ? 'pursuit' : info.kind === 'jutsu' ? 'jutsu' : 'hit';
    const lift = kind === 'pursuit' ? 8 : kind === 'jutsu' ? 5 : 0;
    impactAt(pointFor(target.uid, { lift }), kind, theme, kind === 'pursuit' ? 480 : 390);
  }

  function status(target, meta = {}) {
    spawn('battle-impact battle-impact--status', pointFor(target.uid), {
      duration: 500,
      color: meta.color ?? '#c9b3ff',
    });
  }

  function chain(attacker) {
    impactAt(pointFor(attacker.uid), 'chain', 'pursuit', 540);
  }

  return { action, impact, status, chain };
}
