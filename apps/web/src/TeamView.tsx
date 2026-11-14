import { useEffect, useMemo, useState } from 'react';
import { Coins, Lock, Shield, Swords, UserPlus, Users, Wind, Zap } from 'lucide-react';

type NinjaRole = 'VANGUARD' | 'STRIKER' | 'SUPPORT' | 'CONTROL';

type RosterNinja = {
  code: string;
  name: string;
  role: NinjaRole;
  rarity: number;
  level: number;
  stars: number;
  position: number | null;
  power: number;
  description: string;
};

type CatalogNinja = {
  code: string;
  name: string;
  role: NinjaRole;
  rarity: number;
  description: string;
  recruitCost: number;
  requiredLevel: number;
  owned: boolean;
  position: number | null;
  locked: boolean;
  affordable: boolean;
};

type FormationBonus = {
  power: number;
  maxHp: number;
  maxChakra: number;
  damageBonus: number;
  techniqueBonus: number;
  guardChakra: number;
  damageReduction: number;
};

type RosterOverview = {
  level: number;
  gold: number;
  power: number;
  bonus: FormationBonus;
  slots: { position: number; line: 'front' | 'back'; ninja: RosterNinja | null }[];
  roster: RosterNinja[];
  catalog: CatalogNinja[];
};

const ROLE_LABEL: Record<NinjaRole, string> = {
  VANGUARD: 'Vanguarda',
  STRIKER: 'Atacante',
  SUPPORT: 'Suporte',
  CONTROL: 'Controle',
};

const ROLE_ICON: Record<NinjaRole, typeof Shield> = {
  VANGUARD: Shield,
  STRIKER: Swords,
  SUPPORT: Users,
  CONTROL: Wind,
};

export function TeamView({ api, onProgress }: { api: string; onProgress?: () => void }) {
  const [overview, setOverview] = useState<RosterOverview | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(api + '/roster', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível carregar a equipe.');
      applyOverview(data as RosterOverview);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }

  function applyOverview(data: RosterOverview) {
    setOverview(data);
    const next: Record<number, string> = {};
    for (const slot of data.slots) {
      if (slot.ninja) next[slot.position] = slot.ninja.code;
    }
    setAssignments(next);
  }

  useEffect(() => { void load(); }, []);

  const assignedCodes = useMemo(() => new Set(Object.values(assignments)), [assignments]);

  async function saveFormation() {
    setBusy(true);
    setMessage('');
    try {
      const slots = Object.entries(assignments)
        .filter(([, code]) => Boolean(code))
        .map(([position, code]) => ({ position: Number(position), ninjaCode: code }));
      const response = await fetch(api + '/roster/formation', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível salvar a formação.');
      applyOverview(data as RosterOverview);
      setMessage('Formação salva. O bônus entra no próximo confronto.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar a formação.');
    } finally {
      setBusy(false);
    }
  }

  async function recruit(code: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(api + '/roster/recruit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ninjaCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível recrutar.');
      setMessage(`${data.ninja?.name ?? 'Ninja'} entrou para a sua equipe.`);
      await load();
      onProgress?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao recrutar.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !overview) {
    return <section className="team-empty"><small>EQUIPE · QUARTEL</small><h1>Reunindo sua formação</h1><p className="muted">Carregando esquadrão e catálogo...</p></section>;
  }

  if (!overview) {
    return <section className="team-empty"><small>EQUIPE · QUARTEL</small><h1>Não foi possível abrir o quartel</h1>{message && <p className="message">{message}</p>}<button onClick={() => void load()}>TENTAR NOVAMENTE</button></section>;
  }

  const freeFor = (position: number) =>
    overview.roster.filter((ninja) => {
      const current = assignments[position];
      return ninja.code === current || !assignedCodes.has(ninja.code);
    });

  return <div className="team">
    <div className="combat-heading">
      <div>
        <small>EQUIPE · QUARTEL</small>
        <h1>Formação de esquadrão</h1>
      </div>
      <div className="team-wallet"><Coins/><b>{overview.gold}</b><small>RYŌ</small></div>
    </div>
    {message && <p className="message">{message}</p>}

    <section className="team-summary">
      <div><small>PODER DA FORMAÇÃO</small><b>{overview.power}</b></div>
      <div><small>VITALIDADE EXTRA</small><b>+{overview.bonus.maxHp}</b></div>
      <div><small>CHAKRA EXTRA</small><b>+{overview.bonus.maxChakra}</b></div>
      <div><small>DANO EXTRA</small><b>+{overview.bonus.damageBonus}</b></div>
      <div><small>TÉCNICA EXTRA</small><b>+{overview.bonus.techniqueBonus}</b></div>
      <div><small>DEFESA</small><b>{Math.round(overview.bonus.damageReduction * 100)}%</b></div>
    </section>

    <div className="formation-grid">
      {overview.slots.map((slot) => {
        const selected = assignments[slot.position] ?? '';
        const ninja = overview.roster.find((entry) => entry.code === selected) ?? null;
        const Icon = ninja ? ROLE_ICON[ninja.role] : Users;
        return <article key={slot.position} className={'formation-slot ' + slot.line + (ninja ? ' filled' : '')}>
          <header>
            <b>{slot.position}</b>
            <small>{slot.line === 'front' ? 'FRENTE' : 'RETAGUARDA'}</small>
          </header>
          <div className="slot-body">
            <Icon className="slot-icon"/>
            <h2>{ninja ? ninja.name : 'Posição livre'}</h2>
            <p>{ninja ? `${ROLE_LABEL[ninja.role]} · Nível ${ninja.level} · ${ninja.power} de poder` : 'Escolha um shinobi recrutado para este posto.'}</p>
          </div>
          <select
            value={selected}
            disabled={overview.roster.length === 0}
            onChange={(event) => setAssignments((current) => {
              const next = { ...current };
              if (event.target.value) next[slot.position] = event.target.value;
              else delete next[slot.position];
              return next;
            })}
          >
            <option value="">— vazio —</option>
            {freeFor(slot.position).map((entry) => <option key={entry.code} value={entry.code}>{entry.name} · {ROLE_LABEL[entry.role]}</option>)}
          </select>
        </article>;
      })}
    </div>

    <div className="team-actions">
      <button disabled={busy} onClick={() => void saveFormation()}>{busy ? 'SALVANDO...' : 'SALVAR FORMAÇÃO'}</button>
      <p>Posições 1 e 2 ficam na frente e recebem o primeiro impacto; 3 e 4 atuam na retaguarda.</p>
    </div>

    {overview.roster.length > 0 && <section className="team-roster">
      <small>SEUS SHINOBIS</small>
      <div className="cards">{overview.roster.map((ninja) => {
        const Icon = ROLE_ICON[ninja.role];
        return <article className="card" key={ninja.code}>
          <small>{ROLE_LABEL[ninja.role].toUpperCase()} · {ninja.rarity}★</small>
          <h2><Icon size={16}/> {ninja.name}</h2>
          <p className="muted">{ninja.description}</p>
          <p>Nível <b>{ninja.level}</b> · Poder <b>{ninja.power}</b> · {ninja.position ? `Posição ${ninja.position}` : 'Reserva'}</p>
        </article>;
      })}</div>
    </section>}

    {overview.catalog.length > 0 && <section className="team-catalog">
      <small>CATÁLOGO · RECRUTAR</small>
      <div className="cards">{overview.catalog.map((ninja) => {
        const Icon = ROLE_ICON[ninja.role];
        const blocked = ninja.locked || !ninja.affordable;
        return <article className="card recruit" key={ninja.code}>
          <small>{ROLE_LABEL[ninja.role].toUpperCase()} · {ninja.rarity}★</small>
          <h2><Icon size={16}/> {ninja.name}</h2>
          <p className="muted">{ninja.description}</p>
          <div className="recruit-foot">
            <span><b>{ninja.recruitCost}</b> ryō · nível {ninja.requiredLevel}</span>
            <button disabled={busy || blocked} onClick={() => void recruit(ninja.code)}>
              {ninja.locked ? <><Lock size={13}/> BLOQUEADO</> : ninja.affordable ? <><UserPlus size={13}/> RECRUTAR</> : <><Zap size={13}/> SEM RYŌ</>}
            </button>
          </div>
        </article>;
      })}</div>
    </section>}
  </div>;
}
