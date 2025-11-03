import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/query";
const STORES_URL = "http://localhost:8000/stores";

function useQuery(makePayload, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const payload = makePayload();
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    run();
  }, deps);

  return { data, loading, error };
}

// ====== CARDS KPI ======
function StatCard({ title, value, subtitle, icon = "money" }) {
  const icons = {
    money: (
      <svg
        className="h-8 w-8 text-sky-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 8h.01M17 16h.01" />
      </svg>
    ),
    orders: (
      <svg
        className="h-8 w-8 text-emerald-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7h16" />
        <path d="M10 11h6" />
        <path d="M10 15h6" />
        <path d="M6 11h.01" />
        <path d="M6 15h.01" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </svg>
    ),
    ticket: (
      <svg
        className="h-8 w-8 text-indigo-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 7h14" />
        <path d="M9 3v4" />
        <path d="M15 3v4" />
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M9 14h6" />
        <path d="M9 18h4" />
      </svg>
    ),
  };

  return (
    <div className="flex gap-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 ring-2 ring-white/80 shadow">
        {icons[icon] || icons.money}
      </div>
      <div className="flex flex-col justify-center gap-1">
        <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {title}
        </span>
        <span className="text-2xl font-semibold text-slate-900 leading-tight">
          {value}
        </span>
        {subtitle ? (
          <span className="text-sm text-slate-400">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}

// ====== CARD PRODUTOS ======
function ProductsCard({ loading, error, data, storeName }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Top produtos {storeName ? `(${storeName})` : ""}
          </h2>
          <p className="text-xs text-slate-400">
            Produtos com maior receita
          </p>
        </div>
        {loading ? (
          <span className="text-xs text-slate-400">Carregando...</span>
        ) : null}
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {error ? (
          <p className="p-4 text-sm text-red-500">{error}</p>
        ) : data ? (
          (() => {
            const rows = data.rows || [];
            const sorted = [...rows].sort(
              (a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)
            );
            const top10 = sorted.slice(0, 10);

            return (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-2">Produto</th>
                    <th className="px-3 py-2 text-right">Qtde</th>
                    <th className="px-5 py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top10.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-5 py-2">
                        <p className="font-medium text-slate-900">
                          {r.product_name
                            ? r.product_name
                            : `Produto #${r.product_id}`}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          {storeName ? storeName : `Loja ${r.store_id}`}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {r.qty ?? 0}
                      </td>
                      <td className="px-5 py-2 text-right font-semibold text-slate-900">
                        R$ {Number(r.revenue || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()
        ) : (
          <p className="p-4 text-sm text-slate-400">Sem dados.</p>
        )}
      </div>

      {data ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <p className="text-[10px] font-medium text-slate-500 mb-1">
            SQL usado
          </p>
          <pre className="max-h-28 overflow-auto rounded bg-slate-900 px-3 py-2 text-[10px] text-slate-100">
            {data.sql}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

// ====== CARD HEATMAP ======
function HeatmapCard({ loading, error, data, storeName }) {
  const dias = [
    { id: 0, label: "Dom" },
    { id: 1, label: "Seg" },
    { id: 2, label: "Ter" },
    { id: 3, label: "Qua" },
    { id: 4, label: "Qui" },
    { id: 5, label: "Sex" },
    { id: 6, label: "Sab" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Heatmap de pedidos {storeName ? `(${storeName})` : ""}
          </h2>
          <p className="text-xs text-slate-400">
            Ajuda a identificar horários de pico por dia da semana
          </p>
        </div>
        {loading ? (
          <span className="text-xs text-slate-400">Carregando...</span>
        ) : null}
      </div>

      <div className="overflow-x-auto px-5 py-4">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : data ? (
          (() => {
            const rows = data.rows || [];
            const byDow = {};
            for (const r of rows) {
              const dow = r.dow;
              const hour = r.hour;
              const orders = Number(r.orders || 0);
              if (!byDow[dow]) byDow[dow] = {};
              byDow[dow][hour] = orders;
            }

            return (
              <table className="min-w-[700px] border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[10px] text-slate-500">
                      Dia/hora
                    </th>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <th
                        key={h}
                        className="border border-slate-200 bg-slate-50 px-1 py-1 text-center text-[10px] text-slate-400"
                      >
                        {h}h
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d) => (
                    <tr key={d.id}>
                      <td className="border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
                        {d.label}
                      </td>
                      {Array.from({ length: 24 }).map((_, h) => {
                        const val = byDow[d.id]?.[h] ?? 0;
                        const intensity = Math.min(val / 20, 1);
                        const bg =
                          intensity > 0
                            ? `rgba(14, 165, 233, ${0.15 + intensity * 0.65})`
                            : "white";
                        return (
                          <td
                            key={h}
                            className="border border-slate-200 px-1 py-1 text-right"
                            style={{ background: bg }}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()
        ) : (
          <p className="text-sm text-slate-400">Sem dados.</p>
        )}
      </div>

      {data ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <p className="text-[10px] font-medium text-slate-500 mb-1">
            SQL usado
          </p>
          <pre className="max-h-28 overflow-auto rounded bg-slate-900 px-3 py-2 text-[10px] text-slate-100">
            {data.sql}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

// ====== EXPLORADOR (por canal, histórico ou mês específico) ======
function Explorer({ currentStoreId }) {
  const [metric, setMetric] = useState("revenue");
  const [rows, setRows] = useState([]);
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [channels, setChannels] = useState([]);
  const [months, setMonths] = useState([]);          // [{value:"2025-05", label:"Maio 2025"}, ...]
  const [selectedMonth, setSelectedMonth] = useState(""); // "" = todo histórico

  // carrega canais e meses uma vez
  useEffect(() => {
    (async () => {
      try {
        const [chRes, mRes] = await Promise.all([
          fetch("http://localhost:8000/channels"),
          fetch("http://localhost:8000/months"),
        ]);
        const ch = await chRes.json();
        const ms = await mRes.json();
        setChannels(ch);
        setMonths(ms);
      } catch (e) {
        console.warn("Erro ao carregar canais/meses", e);
      }
    })();
  }, []);

  // roda quando troca loja, métrica ou mês
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr("");
      try {
        const payload = {
          metrics:
            metric === "revenue"
              ? ["revenue", "orders", "avg_ticket"]
              : metric === "orders"
              ? ["orders", "revenue", "avg_ticket"]
              : ["revenue", "orders", "avg_ticket"], // fallback
          dimensions: ["channel_id"],
          filters: [{ field: "store_id", op: "=", value: currentStoreId }],
          // se selectedMonth estiver vazio -> não manda filtro (todo histórico)
          month: selectedMonth || null,
        };

        const res = await fetch("http://localhost:8000/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) {
          setRows(json.rows || []);
          setSql(json.sql || "");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [currentStoreId, metric, selectedMonth]);

  const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue || 0), 0);
  const totalOrders  = rows.reduce((acc, r) => acc + Number(r.orders  || 0), 0);

  function getChannelName(id) {
    const ch = channels.find((c) => c.id === id);
    return ch ? ch.name : `Canal ${id}`;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Comparar canais</h2>
          <p className="text-xs text-slate-400">
            Selecione a métrica e, opcionalmente, um mês específico.
          </p>
        </div>
        {loading ? <span className="text-xs text-slate-400">Atualizando…</span> : null}
      </div>

      {/* controles */}
      <div className="flex flex-wrap gap-4 px-5 py-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Métrica</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="revenue">Faturamento</option>
            <option value="orders">Pedidos</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Período</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm min-w-44"
          >
            <option value="">Todo o histórico</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* resultados */}
      <div className="px-5 pb-4 space-y-4">
        {err ? <p className="text-sm text-red-500">{err}</p> : null}

        {rows.length > 0 ? (
          <>
            {/* cards por canal */}
            <div className="grid gap-3 md:grid-cols-3">
              {rows.map((r, idx) => {
                const rev = Number(r.revenue || 0);
                const ord = Number(r.orders || 0);
                const pctRev = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
                const pctOrd = totalOrders  > 0 ? (ord / totalOrders)  * 100 : 0;

                return (
                  <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      {getChannelName(r.channel_id)}
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {metric === "revenue" ? `R$ ${rev.toFixed(2)}` : `${ord} pedidos`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {pctRev.toFixed(1)}% da receita • {pctOrd.toFixed(1)}% dos pedidos
                    </p>
                  </div>
                );
              })}
            </div>

            {/* tabela */}
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left  text-xs font-medium uppercase tracking-wide text-slate-500">Canal</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Pedidos</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Receita</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Ticket médio</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">% pedidos</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">% receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, idx) => {
                    const rev = Number(r.revenue || 0);
                    const ord = Number(r.orders || 0);
                    const avg = Number(r.avg_ticket || 0);
                    const pctRev = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
                    const pctOrd = totalOrders  > 0 ? (ord / totalOrders)  * 100 : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 text-slate-800">{getChannelName(r.channel_id)}</td>
                        <td className="px-3 py-2 text-right text-slate-800">{ord}</td>
                        <td className="px-3 py-2 text-right text-slate-800">R$ {rev.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-800">R$ {avg.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-800">{pctOrd.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right text-slate-800">{pctRev.toFixed(1)}%</td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-50/80 font-semibold">
                    <td className="px-3 py-2 text-slate-900">Total</td>
                    <td className="px-3 py-2 text-right text-slate-900">{totalOrders}</td>
                    <td className="px-3 py-2 text-right text-slate-900">R$ {totalRevenue.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-slate-900">
                      {totalOrders > 0 ? `R$ ${(totalRevenue / totalOrders).toFixed(2)}` : "R$ 0,00"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900">100%</td>
                    <td className="px-3 py-2 text-right text-slate-900">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SQL */}
            <div>
              <p className="mt-3 mb-1 text-[10px] font-medium text-slate-500">SQL gerado</p>
              <pre className="max-h-28 overflow-auto rounded bg-slate-900 px-3 py-2 text-[10px] text-slate-100">
                {sql}
              </pre>
            </div>
          </>
        ) : !loading ? (
          <p className="text-sm text-slate-400">Nenhum dado para este período.</p>
        ) : null}
      </div>
    </div>
  );
}


// ====== APP PRINCIPAL ======
export default function App() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(1);
  const [storeName, setStoreName] = useState("");

  // carregar lojas
  useEffect(() => {
    async function loadStores() {
      const res = await fetch(STORES_URL);
      const data = await res.json();
      setStores(data);
      if (data.length > 0) {
        setStoreId(data[0].id);
        setStoreName(data[0].name);
      }
    }
    loadStores();
  }, []);

  const handleChangeStore = (e) => {
    const id = Number(e.target.value);
    setStoreId(id);
    const found = stores.find((s) => s.id === id);
    setStoreName(found ? found.name : "");
  };

  const faturamento = useQuery(
    () => ({
      metrics: ["revenue", "orders", "avg_ticket"],
      dimensions: ["date", "store_id", "channel_id"],
      filters: [{ field: "store_id", op: "=", value: storeId }],
      timeRange: { from: "2025-01-01", to: "2025-12-31" },
    }),
    [storeId]
  );

  const topProdutos = useQuery(
    () => ({
      metrics: ["revenue", "qty"],
      dimensions: ["store_id", "product_id"],
      filters: [{ field: "store_id", op: "=", value: storeId }],
    }),
    [storeId]
  );

  const heatmap = useQuery(
    () => ({
      metrics: ["orders"],
      dimensions: ["store_id", "dow", "hour"],
      filters: [{ field: "store_id", op: "=", value: storeId }],
      timeRange: { from: "2025-01-01", to: "2025-12-31" },
    }),
    [storeId]
  );

  // KPI computation
  let totalRevenue = 0;
  let totalOrders = 0;
  let avgTicket = 0;
  if (faturamento.data) {
    const rows = faturamento.data.rows;
    totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue || 0), 0);
    totalOrders = rows.reduce((acc, r) => acc + Number(r.orders || 0), 0);
    avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* top bar */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-white">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Nola Insights
            </h1>
            <p className="text-xs text-sky-100">
              Visão rápida de lojas, produtos e horários.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="store" className="text-xs text-sky-50">
              Loja:
            </label>
            <select
              id="store"
              value={storeId}
              onChange={handleChangeStore}
              className="rounded-md bg-white/90 px-2 py-1 text-sm text-slate-800 shadow-sm focus:outline-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-5 md:grid-cols-3 items-stretch">
          <StatCard
            title="Faturamento"
            value={`R$ ${totalRevenue.toFixed(2)}`}
            subtitle={storeName}
            icon="money"
          />
          <StatCard
            title="Pedidos"
            value={String(totalOrders)}
            subtitle="Total"
            icon="orders"
          />
          <StatCard
            title="Ticket médio"
            value={`R$ ${avgTicket.toFixed(2)}`}
            subtitle="Receita / pedidos"
            icon="ticket"
          />
        </div>

        {/* main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* esquerda: heatmap ocupa 2 colunas */}
          <div className="lg:col-span-2">
            <HeatmapCard
              loading={heatmap.loading}
              error={heatmap.error}
              data={heatmap.data}
              storeName={storeName}
            />
          </div>
          {/* direita: produtos */}
          <div className="lg:col-span-1">
            <ProductsCard
              loading={topProdutos.loading}
              error={topProdutos.error}
              data={topProdutos.data}
              storeName={storeName}
            />
          </div>
        </div>

        {/* NOVO: EXPLORADOR */}
        <Explorer currentStoreId={storeId} />
      </div>
    </div>
  );
}
