
# Nola Insights — Decisões Arquiteturais

**Repositório: https://github.com/lucasvieira94/nola-god-level**   

## 1) Resumo
- **Objetivo:** permitir que a Maria compare desempenho por **canal** (faturamento, pedidos, ticket médio), filtrando por **loja** e por **mês** (ou **todo histórico**).
- **Stack:** React (Vite) → FastAPI → PostgreSQL com **materialized views** (MVs).
- **Estratégia:** agregação no banco (SQL simples, rápido) + endpoint genérico `/query`.

---

## 2) Arquitetura (visão geral)
```
[React/Vite] ──fetch──► [FastAPI /query] ──SQL──► [PostgreSQL]
   ▲                         ▲                         ▲
   ├─ /stores, /channels     └─ cache 120s             └─ MVs para consultas rápidas
   └─ /months
```

- **Frontend:** UI simples com seletores (loja, métrica, mês/histórico) + cards e tabela.
- **Backend:** rotas REST, montagem de SQL a partir de um payload declarativo.
- **Banco:** tabelas brutas + MVs para acelerar leituras comuns.

---

## 3) Endpoints
- `GET /stores` → lojas ativas: `[{ id, name }]`
- `GET /channels` → canais: `[{ id, name, type }]`
- `GET /months` → meses disponíveis (derivados de `sales.created_at`): `[{ value:"YYYY-MM", label:"Maio 2025" }]`
- `POST /query` → consulta agregada por dimensões/métricas

**Exemplo `/query` (comparar canais de uma loja, mês específico):**
```json
{
  "metrics": ["revenue", "orders", "avg_ticket"],
  "dimensions": ["channel_id"],
  "filters": [{ "field": "store_id", "op": "=", "value": 1 }],
  "month": "2025-05"
}
```
**Resposta (exemplo):**
```json
{
  "sql": "SELECT ...",
  "rows": [
    { "channel_id": 1, "revenue": 1234.56, "orders": 12, "avg_ticket": 102.88 }
  ]
}
```

---

## 4) Dados & Materialized Views (MVs)
- **Base:** `sales`, `product_sales`, `item_product_sales`, `products`, `channels`, `stores`, etc.
- **MVs usadas:**
  - `mv_revenue_daily(store_id, channel_id, date, revenue, orders)` → métricas diárias.
  - `mv_top_products_30d(store_id, product_id, product_name, revenue, qty)` → top produtos (janela 30d).
  - `mv_heatmap_hour(store_id, dow, hour, orders[, created_at])` → pedidos por dia/horário.

> Observação: quando a consulta pede produto/dia/heatmap usamos MVs; para comparações simples por canal podemos ler da `sales` (bruto) se necessário.

---

## 5) Como rodar (local)
**Banco & dados (Docker):**
```bash
docker compose up -d postgres
docker compose run --rm data-generator     
```

**Backend:**
```bash
cd backend
.\.venv\Scripts\activate          # Windows
uvicorn app:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev   # http://localhost:5173
```
