import { useEffect, useState } from 'react';
import { Brain, Coins, Lock, Sparkles, Zap } from 'lucide-react';
import type { Character } from './types';

type TalentEffect = { strength?: number; vitality?: number; agility?: number; intelligence?: number };

type Talent = {
  code: string;
  name: string;
  tier: number;
  requiredLevel: number;
  cost: number;
  group: string | null;
  description: string;
  effect: TalentEffect;
  learned: boolean;
  available: boolean;
  locked: boolean;
};

type TalentsOverview = {
  path: string;
  level: number;
  earned: number;
  spent: number;
  available: number;
  learned: string[];
  talents: Talent[];
};

type LearnResponse = { talent: { code: string; name: string }; character: Character };

export function TalentsView({ api, onCharacter }: {
  api: string;
  onCharacter: (character: Character) => void;
}) {
  const [overview, setOverview] = useState<TalentsOverview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(api + '/talents', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível carregar os talentos.');
      setOverview(data as TalentsOverview);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar os talentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function learn(code: string) {
    setBusy(code);
    setMessage('');
    try {
      const response = await fetch(api + '/talents/learn', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talentCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível aprender o talento.');
      const result = data as LearnResponse;
      setMessage(`${result.talent.name} aprendido.`);
      onCharacter(result.character);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao aprender o talento.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !overview) {
    return <section className="team-empty"><small>TALENTOS · CAMINHO</small><h1>Despertando o potencial</h1><p className="muted">Carregando a árvore de talentos...</p></section>;
  }

  if (!overview) {
    return <section className="team-empty"><small>TALENTOS · CAMINHO</small><h1>Não foi possível abrir os talentos</h1>{message && <p className="message">{message}</p>}<button onClick={() => void load()}>TENTAR NOVAMENTE</button></section>;
  }

  const tiers = [...new Set(overview.talents.map((talent) => talent.tier))].sort((a, b) => a - b);

  return <div className="talents">
    <div className="combat-heading">
      <div>
        <small>TALENTOS · {overview.path.replace(/_/g, ' ')}</small>
        <h1>Árvore de talentos</h1>
      </div>
      <div className="team-wallet"><Sparkles/><b>{overview.available}</b><small>PONTOS ({overview.spent}/{overview.earned})</small></div>
    </div>
    {message && <p className="message">{message}</p>}
    <p className="missions-note">Cada nível concede um ponto de talento. Escolha com cuidado: os degraus de especialização são mutuamente exclusivos.</p>

    {tiers.map((tier) => (
      <section key={tier} className="team-roster">
        <small>DEGRAU {tier} · NÍVEL {overview.talents.find((t) => t.tier === tier)?.requiredLevel}+</small>
        <div className="mission-grid">
          {overview.talents.filter((talent) => talent.tier === tier).map((talent) => {
            const busyHere = busy === talent.code;
            const blocked = talent.locked || talent.learned || !talent.available || busyHere;
            const effectText = Object.entries(talent.effect)
              .filter(([, value]) => (value ?? 0) > 0)
              .map(([key, value]) => `${key === 'strength' ? 'FOR' : key === 'vitality' ? 'VIT' : key === 'agility' ? 'AGI' : 'INT'} +${value}`)
              .join(' · ');
            return <article key={talent.code} className={'card mission-card' + (talent.learned ? ' featured' : talent.locked ? ' status-completed' : '')}>
              <header>
                <small>{talent.learned ? 'APRENDIDO' : talent.locked ? `NÍVEL ${talent.requiredLevel}` : talent.available ? 'DISPONÍVEL' : 'BLOQUEADO'}</small>
                <Brain size={16}/>
              </header>
              <h2>{talent.name}</h2>
              <p className="muted">{talent.description}</p>
              <div className="mission-enemy"><Zap size={14}/><span>{effectText}</span></div>
              <button disabled={blocked} onClick={() => void learn(talent.code)}>
                {busyHere ? 'APRENDENDO...' : talent.learned ? <><Sparkles size={13}/> APRENDIDO</> : talent.locked ? <><Lock size={13}/> NÍVEL {talent.requiredLevel}</> : !talent.available ? <><Lock size={13}/> INDISPONÍVEL</> : <><Sparkles size={13}/> APRENDER · 1 PONTO</>}
              </button>
            </article>;
          })}
        </div>
      </section>
    ))}
  </div>;
}
