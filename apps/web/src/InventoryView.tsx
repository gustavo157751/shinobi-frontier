import { useEffect, useState } from 'react';
import { Backpack, FlaskConical, Gem, Zap } from 'lucide-react';
import type { Character } from './types';

type InventoryItem = {
  code: string;
  name: string;
  kind: 'CONSUMABLE' | 'MATERIAL';
  rarity: number;
  description: string;
  usable: boolean;
  effect: { energy: number } | null;
  quantity: number;
};

type InventoryOverview = { energy: number; maxEnergy: number; items: InventoryItem[] };

type UseResponse = {
  item: { code: string; name: string; remaining: number };
  restored: number;
  character: Character;
};

export function InventoryView({ api, onCharacter }: {
  api: string;
  onCharacter: (character: Character) => void;
}) {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(api + '/inventory', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível carregar o inventário.');
      setOverview(data as InventoryOverview);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar o inventário.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function use(code: string) {
    setBusy(code);
    setMessage('');
    try {
      const response = await fetch(api + '/inventory/use', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível usar o item.');
      const used = data as UseResponse;
      setMessage(`${used.item.name} usado: ${used.restored} de energia recuperados.`);
      onCharacter(used.character);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao usar o item.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !overview) {
    return <section className="team-empty"><small>INVENTÁRIO · MOCHILA</small><h1>Conferindo seus recursos</h1><p className="muted">Carregando itens e energia...</p></section>;
  }

  if (!overview) {
    return <section className="team-empty"><small>INVENTÁRIO · MOCHILA</small><h1>Não foi possível abrir a mochila</h1>{message && <p className="message">{message}</p>}<button onClick={() => void load()}>TENTAR NOVAMENTE</button></section>;
  }

  return <div className="inventory">
    <div className="combat-heading">
      <div>
        <small>INVENTÁRIO · MOCHILA</small>
        <h1>Recursos de viagem</h1>
      </div>
      <div className="team-wallet"><Zap/><b>{overview.energy}/{overview.maxEnergy}</b><small>ENERGIA</small></div>
    </div>
    {message && <p className="message">{message}</p>}

    {overview.items.length === 0
      ? <section className="inventory-empty"><Backpack size={28}/><h2>A mochila está vazia</h2><p className="muted">Complete missões para encontrar consumíveis e materiais. A energia também regenera com o tempo: 1 ponto por minuto.</p></section>
      : <div className="inventory-grid">
        {overview.items.map((item) => {
          const Icon = item.kind === 'CONSUMABLE' ? FlaskConical : Gem;
          const busyHere = busy === item.code;
          return <article key={item.code} className="card item-card">
            <header>
              <small>{item.kind === 'CONSUMABLE' ? 'CONSUMÍVEL' : 'MATERIAL'} · {item.rarity}★</small>
              <b className="item-quantity">x{item.quantity}</b>
            </header>
            <h2><Icon size={16}/> {item.name}</h2>
            <p className="muted">{item.description}</p>
            {item.effect && <p className="item-effect"><Zap size={13}/> Recupera {item.effect.energy} de energia</p>}
            <button disabled={!item.usable || busyHere} onClick={() => void use(item.code)}>
              {busyHere ? 'USANDO...' : item.usable ? <><FlaskConical size={13}/> USAR</> : <><Gem size={13}/> MATERIAL</>}
            </button>
          </article>;
        })}
      </div>}
  </div>;
}
