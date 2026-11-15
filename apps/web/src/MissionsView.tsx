import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Hourglass, Lock, ScrollText, Swords, Zap } from 'lucide-react';
import type { Battle, Character } from './types';

type MissionStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';

type MissionRewardItem = { code: string; name: string; quantity: number };

type Mission = {
  code: string;
  name: string;
  description: string;
  requiredLevel: number;
  energyCost: number;
  status: MissionStatus;
  locked: boolean;
  affordable: boolean;
  enemy: { name: string; level: number };
  rewards: { experience: number; gold: number; items: MissionRewardItem[] };
};

type MissionsOverview = {
  level: number;
  energy: number;
  maxEnergy: number;
  activeMission: string | null;
  missions: Mission[];
};

type AcceptResponse = {
  battle: Battle;
  character: Character;
  mission: { code: string; name: string; energyCost: number };
};

export function MissionsView({ api, onBattle, onProgress }: {
  api: string;
  onBattle: (payload: { battle: Battle; character: Character }) => void;
  onProgress?: () => void;
}) {
  const [overview, setOverview] = useState<MissionsOverview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(api + '/missions', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível carregar as missões.');
      setOverview(data as MissionsOverview);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar as missões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function accept(code: string) {
    setBusy(code);
    setMessage('');
    try {
      const response = await fetch(api + '/missions/accept', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível aceitar a missão.');
      const accepted = data as AcceptResponse;
      setMessage(`${accepted.mission.name} aceita. O confronto vai começar.`);
      onProgress?.();
      onBattle({ battle: accepted.battle, character: accepted.character });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao aceitar a missão.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !overview) {
    return <section className="team-empty"><small>MISSÕES · QUADRO DA VILA</small><h1>Lendo os pedidos da serra</h1><p className="muted">Carregando a trilha de missões...</p></section>;
  }

  if (!overview) {
    return <section className="team-empty"><small>MISSÕES · QUADRO DA VILA</small><h1>Não foi possível abrir o quadro</h1>{message && <p className="message">{message}</p>}<button onClick={() => void load()}>TENTAR NOVAMENTE</button></section>;
  }

  return <div className="missions">
    <div className="combat-heading">
      <div>
        <small>MISSÕES · QUADRO DA VILA</small>
        <h1>Trilha da serra</h1>
      </div>
      <div className="team-wallet"><Zap/><b>{overview.energy}/{overview.maxEnergy}</b><small>ENERGIA</small></div>
    </div>
    {message && <p className="message">{message}</p>}
    <p className="missions-note">Aceite uma missão por vez. O confronto ativo precisa ser concluído antes do próximo pedido, e a recompensa só é creditada na vitória.</p>

    <div className="mission-grid">
      {overview.missions.map((mission) => {
        const completed = mission.status === 'COMPLETED';
        const active = mission.status === 'ACTIVE';
        const busyHere = busy === mission.code;
        const blocked = completed || active || mission.locked || !mission.affordable;
        return <article key={mission.code} className={'card mission-card status-' + mission.status.toLowerCase() + (active ? ' featured' : '')}>
          <header>
            <small>{completed ? 'CONCLUÍDA' : active ? 'EM ANDAMENTO' : `MISSÃO DE NÍVEL ${mission.requiredLevel}+`}</small>
            {completed ? <CheckCircle2 size={16}/> : active ? <Hourglass size={16}/> : <ScrollText size={16}/>}
          </header>
          <h2>{mission.name}</h2>
          <p className="muted">{mission.description}</p>
          <div className="mission-enemy"><Swords size={14}/><span>Encontro: <b>{mission.enemy.name}</b> · nível {mission.enemy.level}</span></div>
          <div className="mission-rewards">
            <span><Coins size={13}/> {mission.rewards.gold} ryō</span>
            <span><Zap size={13}/> {mission.rewards.experience} xp</span>
            {mission.rewards.items.map((item) => <span key={item.code}><ScrollText size={13}/> {item.name} x{item.quantity}</span>)}
          </div>
          <button disabled={blocked || busyHere} onClick={() => void accept(mission.code)}>
            {busyHere ? 'INICIANDO...' : completed ? <><CheckCircle2 size={13}/> CONCLUÍDA</> : active ? <><Hourglass size={13}/> EM ANDAMENTO</> : mission.locked ? <><Lock size={13}/> NÍVEL {mission.requiredLevel}</> : !mission.affordable ? <><Zap size={13}/> ENERGIA INSUFICIENTE</> : <><Swords size={13}/> ACEITAR · {mission.energyCost} ENERGIA</>}
          </button>
        </article>;
      })}
    </div>
  </div>;
}
