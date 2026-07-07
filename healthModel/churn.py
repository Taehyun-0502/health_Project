# -*- coding: utf-8 -*-
"""
헬스장 회원 이탈 예측 — FastAPI 백엔드 (churn service)
--------------------------------------------------------------------
역할:
    PostgreSQL(Supabase)의 h_model_data + h_survey 테이블을 조회 → 모델 피처로 매핑 →
    predict.py(엔진) 호출 → Spring Boot 백엔드가 소비할 JSON 응답 반환.

실행:
    uvicorn churn:app --host 0.0.0.0 --port 8000
    또는  python churn.py

DB 설정:
    healthModel/.env 가 있으면 우선 사용, 없으면 백엔드 .env
    (../healthcareBack/app/.env)의 DB_URL/DB_USERNAME/DB_PASSWORD 를 재사용한다.
    → 비밀번호를 여러 곳에 중복 저장하지 않기 위함.

엔드포인트(1차):
    GET /health              헬스체크
    GET /churn/{username}    회원 1명 진단 + 개선 시뮬레이션
    GET /churn               헬스장 전체 대시보드 집계
"""
import os
import sys
from contextlib import contextmanager
from urllib.parse import urlparse, unquote

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pandas as pd
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# 엔진 재사용 (app.py 와 동일한 predict.py)
from predict import predict, simulate, predict_gym


# ─────────────────────────── DB 설정 ───────────────────────────
def _load_db_config():
    """healthModel/.env 우선, 없으면 백엔드 .env(jdbc URL)를 재사용해 DB 접속정보 구성."""
    load_dotenv(os.path.join(HERE, ".env"))  # 있으면 로드(직접 지정한 값 우선)
    back_env = os.path.abspath(os.path.join(HERE, "..", "healthcareBack", ".env"))
    load_dotenv(back_env, override=False)     # 백엔드 값으로 보충(기존 값은 유지)

    user = os.getenv("DB_USER") or os.getenv("DB_USERNAME")
    password = os.getenv("DB_PASSWORD")
    url = os.getenv("DB_URL")

    if url and url.startswith("jdbc:"):
        # 예) jdbc:postgresql://host:6543/postgres?prepareThreshold=0
        u = urlparse(url[len("jdbc:"):])
        return {
            "host": u.hostname,
            "port": u.port or 5432,
            "dbname": (u.path or "/postgres").lstrip("/") or "postgres",
            "user": user,
            "password": password,
        }
    # 파이썬용으로 직접 지정한 경우(DB_HOST/DB_PORT/DB_NAME)
    return {
        "host": os.getenv("DB_HOST"),
        "port": int(os.getenv("DB_PORT", "6543")),
        "dbname": os.getenv("DB_NAME", "postgres"),
        "user": user,
        "password": unquote(password) if password else None,
    }


DB = _load_db_config()
TABLE = os.getenv("MODEL_TABLE", "h_model_data")
SURVEY_TABLE = os.getenv("SURVEY_TABLE", "h_survey")

# h_model_data + h_survey 에서 읽어올 컬럼 (모델 피처 + 식별/세그먼트용)
SELECT_COLS = (
    "data_id, username, age, total_month, visit_per_week, aver_exercise, "
    "pt_yn, group_yn, time_cong, last_days, contract_type, "
    "survey_id, cost_rate, employee_rate, service_rate, equip_rate, "
    "member_issue, injury_issue, injury_area"
)


@contextmanager
def get_conn():
    conn = psycopg.connect(**DB, row_factory=dict_row)
    # Supabase 트랜잭션 풀러(pgbouncer, 6543) 호환 — prepared statement 비활성화
    conn.prepare_threshold = None
    try:
        yield conn
    finally:
        conn.close()


# ─────────────────────── 컬럼 → 모델 피처 매핑 ───────────────────────
def row_to_member(r: dict) -> dict:
    """h_model_data + h_survey 한 행 → predict.py 가 기대하는 회원 dict.

    · 설문이 없는 회원은 LEFT JOIN 결과가 NULL이므로 설문 피처를 넣지 않는다.
      predict.py 가 결측(NaN)='설문 미응답'으로 자동 처리한다.
    · 상대_방문공백은 넣지 않는다 → predict._vectorize 가
      (마지막_방문_경과일, 이번달_주당방문횟수)로 자동 계산.
    · contract_type/username 은 모델 피처가 아니라 식별·세그먼트용.
    """
    def num(v):
        return float(v) if v is not None else None  # Decimal(numeric) → float

    member = {
        "나이": r.get("age"),
        "총_이용개월수": r.get("total_month"),
        "이번달_주당방문횟수": num(r.get("visit_per_week")),
        "최근한달_일평균_운동시간": num(r.get("aver_exercise")),
        "PT_가입여부": 1 if r.get("pt_yn") else 0,
        "그룹수업_참여": 1 if r.get("group_yn") else 0,
        "주_이용_시간대_혼잡도": r.get("time_cong"),
        "마지막_방문_경과일": r.get("last_days"),
        # 추가 메타데이터
        "gym_id": r.get("gym_id"),
        "gym_name": r.get("gym_name"),
    }

    # survey_id가 있으면 설문 응답값을 모델 피처로 함께 전달
    if r.get("survey_id") is not None:
        member.update({
            "가격_만족도": r.get("cost_rate"),
            "직원_만족도": r.get("employee_rate"),
            "서비스_만족도": r.get("service_rate"),
            "기구_만족도": r.get("equip_rate"),
            "불편_회원_경험": 1 if r.get("member_issue") else 0,
            "최근한달_부상경험": 1 if r.get("injury_issue") else 0,
        })

    return member


def fetch_one(username: int):
    with get_conn() as conn, conn.cursor() as cur:
        query = f'''
            SELECT
                m.data_id,
                m.username,
                m.age,
                m.total_month,
                m.visit_per_week,
                m.aver_exercise,
                m.pt_yn,
                m.group_yn,
                m.time_cong,
                m.last_days,
                m.contract_type,
                s.survey_id,
                s.cost_rate,
                s.employee_rate,
                s.service_rate,
                s.equip_rate,
                s.member_issue,
                s.injury_issue,
                s.injury_area,
                mem.gym_id,
                g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, cost_rate, employee_rate, service_rate, equip_rate,
                       member_issue, injury_issue, injury_area
                FROM "{SURVEY_TABLE}"
                WHERE username = m.username
                ORDER BY survey_id DESC
                LIMIT 1
            ) s ON TRUE
            WHERE m.username = %s
        '''
        cur.execute(query, (username,))
        return cur.fetchone()


def fetch_all():
    with get_conn() as conn, conn.cursor() as cur:
        query = f'''
            SELECT
                m.data_id,
                m.username,
                m.age,
                m.total_month,
                m.visit_per_week,
                m.aver_exercise,
                m.pt_yn,
                m.group_yn,
                m.time_cong,
                m.last_days,
                m.contract_type,
                s.survey_id,
                s.cost_rate,
                s.employee_rate,
                s.service_rate,
                s.equip_rate,
                s.member_issue,
                s.injury_issue,
                s.injury_area,
                mem.gym_id,
                g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, cost_rate, employee_rate, service_rate, equip_rate,
                       member_issue, injury_issue, injury_area
                FROM "{SURVEY_TABLE}"
                WHERE username = m.username
                ORDER BY survey_id DESC
                LIMIT 1
            ) s ON TRUE
        '''
        cur.execute(query)
        return cur.fetchall()


def fetch_gyms():
    with get_conn() as conn, conn.cursor() as cur:
        query = 'SELECT gym_id, gym_name FROM "h_gym" ORDER BY gym_id ASC'
        cur.execute(query)
        return cur.fetchall()


def fetch_recent_inouts(username: int = None) -> list:
    """h_check_inout 테이블에서 최근 30일간의 출결 데이터를 조회"""
    with get_conn() as conn, conn.cursor() as cur:
        if username is not None:
            query = '''
                SELECT username, check_in, duration 
                FROM "h_check_inout"
                WHERE username = %s 
                  AND check_in >= CURRENT_DATE - INTERVAL '30 days'
            '''
            cur.execute(query, (username,))
        else:
            query = '''
                SELECT username, check_in, duration 
                FROM "h_check_inout"
                WHERE check_in >= CURRENT_DATE - INTERVAL '30 days'
            '''
            cur.execute(query)
        return cur.fetchall()


def calculate_visit_per_week_pandas(inouts_list: list, username: int) -> float:
    """Pandas를 사용해 특정 회원의 최근 30일간 주당 방문 횟수를 계산 (소수점 둘째자리 반올림)"""
    if not inouts_list:
        return 0.0
    df = pd.DataFrame(inouts_list)
    user_df = df[df['username'] == username]
    if user_df.empty:
        return 0.0
    
    # check_in을 datetime 및 date 형식으로 변환하여 고유 일수 계산
    user_df['date'] = pd.to_datetime(user_df['check_in']).dt.date
    unique_days = user_df['date'].nunique()
    
    return round(float(unique_days / 4.2857), 2)


def calculate_all_visit_per_week_pandas(inouts_list: list) -> dict:
    """Pandas를 사용해 전체 회원별 최근 30일간 주당 방문 횟수를 계산하여 dict로 반환 {username: visit_per_week} (소수점 둘째자리 반올림)"""
    if not inouts_list:
        return {}
    df = pd.DataFrame(inouts_list)
    df['date'] = pd.to_datetime(df['check_in']).dt.date
    
    # username별 고유 방문 일수 집계
    grouped = df.groupby('username')['date'].nunique()
    visit_per_week_series = (grouped / 4.2857).round(2)
    return visit_per_week_series.to_dict()


def calculate_aver_exercise_pandas(inouts_list: list, username: int) -> float:
    """Pandas를 사용해 특정 회원의 최근 30일간 하루 평균 운동시간(분)을 계산 (duration 평균 * 60)"""
    if not inouts_list:
        return 0.0
    df = pd.DataFrame(inouts_list)
    user_df = df[df['username'] == username]
    if user_df.empty:
        return 0.0
    
    avg_duration = user_df['duration'].fillna(0).mean()
    return float(avg_duration * 60)


def calculate_all_aver_exercise_pandas(inouts_list: list) -> dict:
    """Pandas를 사용해 전체 회원별 최근 30일간 하루 평균 운동시간(분)을 계산하여 dict로 반환 {username: aver_exercise}"""
    if not inouts_list:
        return {}
    df = pd.DataFrame(inouts_list)
    df['duration'] = df['duration'].fillna(0)
    
    grouped = df.groupby('username')['duration'].mean()
    aver_exercise_series = grouped * 60
    return aver_exercise_series.to_dict()


def fetch_last_check_in_date_by_username(username: int) -> datetime.date:
    """특정 회원의 h_check_inout 테이블 기준 가장 최근 입실일(check_in)을 조회"""
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            SELECT MAX(check_in) AS max_check_in
            FROM "h_check_inout"
            WHERE username = %s
        '''
        cur.execute(query, (username,))
        res = cur.fetchone()
        return res.get("max_check_in").date() if res and res.get("max_check_in") else None


def fetch_all_last_check_in_dates() -> dict:
    """전체 회원의 h_check_inout 테이블 기준 가장 최근 입실일(check_in)을 조회하여 {username: check_in_date} 반환"""
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            SELECT username, MAX(check_in) AS max_check_in
            FROM "h_check_inout"
            GROUP BY username
        '''
        cur.execute(query)
        return {row.get("username"): row.get("max_check_in").date() for row in cur.fetchall() if row.get("max_check_in")}


def calculate_last_days(username: int) -> int:
    """특정 회원의 마지막 방문 후 경과일(last_days) 계산 (현재날짜 - 마지막 check_in 날짜)"""
    import datetime
    last_date = fetch_last_check_in_date_by_username(username)
    if last_date is None:
        return 999  # 출석 기록이 아예 없는 회원은 999일 경과로 셋팅
    today = datetime.date.today()
    return (today - last_date).days


def calculate_all_last_days() -> dict:
    """전체 회원의 마지막 방문 후 경과일(last_days) 계산하여 dict로 반환 {username: last_days}"""
    import datetime
    today = datetime.date.today()
    last_dates = fetch_all_last_check_in_dates()
    return {username: (today - dt).days for username, dt in last_dates.items()}


# ─────────────────────────── FastAPI ───────────────────────────
app = FastAPI(title="Churn Prediction API", version="0.1.0")

_origins = [o for o in (os.getenv("FRONTEND_SERVER_URL"),
                        os.getenv("BACKEND_SERVER_URL")) if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "table": TABLE, "survey_table": SURVEY_TABLE}


@app.get("/churn/{username}")
def churn_member(username: int):
    """회원 1명 → 위험등급·이탈요인(진단) + 개선 시뮬레이션."""
    row = fetch_one(username)
    if row is None:
        raise HTTPException(status_code=404,
                            detail=f"member {username} not found in {TABLE}")
    
    # 최근 30일 출결을 바탕으로 주당 방문 횟수 및 일평균 운동시간 계산
    inouts = fetch_recent_inouts(username)
    visit_per_week = calculate_visit_per_week_pandas(inouts, username)
    aver_exercise = calculate_aver_exercise_pandas(inouts, username)
    last_days = calculate_last_days(username)
    
    member = row_to_member(row)
    member["이번달_주당방문횟수"] = visit_per_week
    member["최근한달_일평균_운동시간"] = aver_exercise
    member["마지막_방문_경과일"] = last_days
    
    return {
        "username": row["username"],
        "contract_type": row.get("contract_type"),
        "visit_per_week": visit_per_week,  # 백엔드 기입용
        "aver_exercise": aver_exercise,    # 백엔드 기입용
        "last_days": last_days,            # 백엔드 기입용
        "진단": predict(member),
        "시뮬레이션": simulate(member),
    }


@app.get("/churn")
def churn_gym():
    """헬스장 전체(h_model_data 전 회원) 대시보드 집계."""
    rows = fetch_all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"no rows in {TABLE}")
    
    # 최근 30일 출결을 바탕으로 전체 회원의 주당 방문 횟수 및 일평균 운동시간 계산
    inouts = fetch_recent_inouts()
    visits_map = calculate_all_visit_per_week_pandas(inouts)
    exercise_map = calculate_all_aver_exercise_pandas(inouts)
    last_days_map = calculate_all_last_days()
    
    members = []
    for r in rows:
        m = row_to_member(r)
        m["이번달_주당방문횟수"] = visits_map.get(r["username"], 0.0)
        m["최근한달_일평균_운동시간"] = exercise_map.get(r["username"], 0.0)
        m["마지막_방문_경과일"] = last_days_map.get(r["username"], 999)
        members.append(m)
        
    return predict_gym(members)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("churn:app", host="0.0.0.0", port=8000, reload=False)
