from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg
import os
import json
import hashlib
import time
from datetime import datetime

# ===== CONFIGURAÇÃO DO BANCO =====
PG_DSN = os.getenv(
    "PG_DSN",
    "postgresql://challenge:challenge_2024@localhost:5432/challenge_db"
)

# cache simples em memória (para repetir a mesma consulta)
_CACHE: dict[str, dict] = {}
CACHE_TTL = 120  # segundos

app = FastAPI(title="Nola Insights MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/stores")
def list_stores():
    try:
        with psycopg.connect(PG_DSN) as conn:
            cur = conn.execute(
                "SELECT id, name FROM stores WHERE is_active = true ORDER BY name"
            )
            rows = [dict(zip([d.name for d in cur.description], r)) for r in cur.fetchall()]
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/channels")
def list_channels():
    with psycopg.connect(PG_DSN) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("""
                SELECT id, name, type
                FROM channels
                ORDER BY id
            """)
            rows = cur.fetchall()
            return rows

# NOVO: lista de meses disponíveis no dataset (derivado de sales.created_at)
@app.get("/months")
def list_months():
    try:
        with psycopg.connect(PG_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT date_trunc('month', created_at)::date AS month_start
                    FROM sales
                    ORDER BY month_start DESC
                """)
                rows = cur.fetchall()
        # monta label "Maio 2025", "Abril 2025", ...
        meses_pt = [
            "janeiro","fevereiro","março","abril","maio","junho",
            "julho","agosto","setembro","outubro","novembro","dezembro"
        ]
        out = []
        for (month_start,) in rows:
            # month_start vem como date
            ym = month_start.strftime("%Y-%m")
            label = f"{meses_pt[month_start.month-1].capitalize()} {month_start.year}"
            out.append({"value": ym, "label": label})
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class Filter(BaseModel):
    field: str
    op: str = "="
    value: str | int

class QueryPayload(BaseModel):
    metrics: list[str] = Field(default_factory=list)
    dimensions: list[str] = Field(default_factory=list)
    filters: list[Filter] = Field(default_factory=list)
    timeRange: dict = Field(default_factory=dict)  # ignorado
    # NOVO: mês opcional no formato "YYYY-MM" (ex.: "2025-05")
    month: str | None = None

def make_cache_key(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

def pick_source(dimensions: set[str]) -> str:
    """
    Decide qual fonte usar:
    - se pedir dow/hour -> mv_heatmap_hour
    - se pedir dia -> mv_revenue_daily
    - se pedir produto -> mv_top_products_30d
    senão -> sales (bruto)
    """
    if {"dow", "hour"} <= dimensions:
        return "mv_heatmap_hour s"
    if "date" in dimensions:
        return "mv_revenue_daily s"
    if "product_id" in dimensions:
        return "mv_top_products_30d s"
    return "sales s"

@app.post("/query")
def query(payload: QueryPayload):
    payload_dict = payload.model_dump()

    # 1) cache
    k = make_cache_key(payload_dict)
    hit = _CACHE.get(k)
    if hit and (time.time() - hit["ts"] < CACHE_TTL):
        return hit["data"]

    dims = set(payload.dimensions)
    src = pick_source(dims)

    # 2) montar SELECT
    select_cols: list[str] = []
    group_cols: list[str] = []

    # dimensões
    if "date" in dims:
        if "mv_revenue_daily" in src:
            select_cols.append("s.date")
            group_cols.append("s.date")
        else:
            select_cols.append("date_trunc('day', s.created_at)::date AS date")
            group_cols.append("date_trunc('day', s.created_at)::date")
    if "store_id" in dims:
        select_cols.append("s.store_id")
        group_cols.append("s.store_id")
    if "channel_id" in dims:
        select_cols.append("s.channel_id")
        group_cols.append("s.channel_id")
    if "product_id" in dims:
        select_cols.append("s.product_id")
        group_cols.append("s.product_id")
        if "mv_top_products_30d" in src:
            select_cols.append("s.product_name")
            group_cols.append("s.product_name")
    if "dow" in dims:
        select_cols.append("s.dow")
        group_cols.append("s.dow")
    if "hour" in dims:
        select_cols.append("s.hour")
        group_cols.append("s.hour")

    # métricas
    metric_cols: list[str] = []
    if "mv_revenue_daily" in src:
        if "revenue" in payload.metrics:
            metric_cols.append("SUM(s.revenue)::numeric(12,2) AS revenue")
        if "orders" in payload.metrics:
            metric_cols.append("SUM(s.orders) AS orders")
        if "avg_ticket" in payload.metrics:
            metric_cols.append("SUM(s.revenue)/NULLIF(SUM(s.orders),0) AS avg_ticket")
    elif "mv_top_products_30d" in src:
        if "revenue" in payload.metrics:
            metric_cols.append("SUM(s.revenue)::numeric(12,2) AS revenue")
        if "qty" in payload.metrics:
            metric_cols.append("SUM(s.qty) AS qty")
    elif "mv_heatmap_hour" in src:
        if "orders" in payload.metrics:
            metric_cols.append("SUM(s.orders) AS orders")
    else:
        # sales bruto
        if "revenue" in payload.metrics:
            metric_cols.append("SUM(s.total_amount)::numeric(12,2) AS revenue")
        if "orders" in payload.metrics:
            metric_cols.append("COUNT(*) AS orders")
        if "avg_ticket" in payload.metrics:
            metric_cols.append("SUM(s.total_amount)/NULLIF(COUNT(*),0) AS avg_ticket")

    if not select_cols and not metric_cols:
        select_cols.append("*")

    select_clause = ", ".join(select_cols + metric_cols)

    # 3) WHERE
    where_clauses: list[str] = []
    params: dict[str, str | int] = {}

    # filtros básicos
    for f in payload.filters:
        if f.field in {"store_id", "channel_id", "product_id"}:
            where_clauses.append(f"s.{f.field} {f.op} %({f.field})s")
            params[f.field] = f.value

    # NOVO: filtro por mês (se vier "month": "YYYY-MM")
    if payload.month:
        if "mv_revenue_daily" in src:
            where_clauses.append("s.date >= to_date(%(m)s,'YYYY-MM')")
            where_clauses.append("s.date < (to_date(%(m)s,'YYYY-MM') + INTERVAL '1 month')")
            params["m"] = payload.month
        elif "sales" in src:
            where_clauses.append("s.created_at >= to_date(%(m)s,'YYYY-MM')")
            where_clauses.append("s.created_at < (to_date(%(m)s,'YYYY-MM') + INTERVAL '1 month')")
            params["m"] = payload.month
        # se for mv_top_products_30d ou mv_heatmap_hour e você quiser filtrar por mês,
        # precisaria ter coluna de data nelas. Mantemos sem filtro nestes casos.

    where_clause = ""
    if where_clauses:
        where_clause = " WHERE " + " AND ".join(where_clauses)

    # 4) GROUP BY
    group_clause = ""
    if group_cols:
        group_clause = " GROUP BY " + ", ".join(group_cols)

    sql = f"SELECT {select_clause} FROM {src}{where_clause}{group_clause} ORDER BY 1"

    # 5) executar no postgres
    try:
        with psycopg.connect(PG_DSN) as conn:
            cur = conn.execute(sql, params)
            rows = [dict(zip([d.name for d in cur.description], r)) for r in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = {
        "sql": sql,
        "rows": rows,
    }

    _CACHE[k] = {"ts": time.time(), "data": data}

    return data
