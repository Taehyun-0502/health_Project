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
    "model_id, username, age, total_month, visit_per_week, aver_exercise, "
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
                m.model_id,
                m.churn,
                m.username,
                COALESCE(
                    (
                        SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INT
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND birth_date IS NOT NULL
                        ORDER BY data_id DESC
                        LIMIT 1
                    ),
                    m.age
                ) AS age,
                COALESCE(
                    (
                        SELECT (EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(start_date))) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(start_date))))::INT
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND start_date IS NOT NULL
                    ),
                    m.total_month
                ) AS total_month,
                m.visit_per_week,
                m.aver_exercise,
                EXISTS (
                    SELECT 1
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username
                      AND contract = 4
                ) AS pt_yn,
                m.group_yn,
                m.time_cong,
                m.last_days,
                COALESCE(
                    (
                        SELECT CONCAT(ROUND((end_date - signed_at::date)::NUMERIC / 30.0)::INT, '개월')
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND end_date IS NOT NULL
                          AND signed_at IS NOT NULL
                        ORDER BY data_id DESC
                        LIMIT 1
                    ),
                    m.contract_type
                ) AS contract_type,
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
                m.model_id,
                m.churn,
                m.username,
                COALESCE(
                    (
                        SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INT
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND birth_date IS NOT NULL
                        ORDER BY data_id DESC
                        LIMIT 1
                    ),
                    m.age
                ) AS age,
                COALESCE(
                    (
                        SELECT (EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(start_date))) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(start_date))))::INT
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND start_date IS NOT NULL
                    ),
                    m.total_month
                ) AS total_month,
                m.visit_per_week,
                m.aver_exercise,
                EXISTS (
                    SELECT 1
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username
                      AND contract = 4
                ) AS pt_yn,
                m.group_yn,
                m.time_cong,
                m.last_days,
                COALESCE(
                    (
                        SELECT CONCAT(ROUND((end_date - signed_at::date)::NUMERIC / 30.0)::INT, '개월')
                        FROM "h_contract_data"
                        WHERE receiver_id = m.username
                          AND end_date IS NOT NULL
                          AND signed_at IS NOT NULL
                        ORDER BY data_id DESC
                        LIMIT 1
                    ),
                    m.contract_type
                ) AS contract_type,
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
            WHERE EXISTS (
                SELECT 1 FROM "h_check_inout" c WHERE c.username = m.username
            )
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
    """Pandas를 사용해 특정 회원의 최근 30일간 하루 평균 운동시간(분)을 계산 (duration 평균, duration=분 단위)"""
    if not inouts_list:
        return 0.0
    df = pd.DataFrame(inouts_list)
    user_df = df[df['username'] == username]
    if user_df.empty:
        return 0.0

    avg_duration = user_df['duration'].fillna(0).mean()
    return float(avg_duration)


def calculate_all_aver_exercise_pandas(inouts_list: list) -> dict:
    """Pandas를 사용해 전체 회원별 최근 30일간 하루 평균 운동시간(분)을 계산하여 dict로 반환 {username: aver_exercise} (duration=분 단위)"""
    if not inouts_list:
        return {}
    df = pd.DataFrame(inouts_list)
    df['duration'] = df['duration'].fillna(0)

    aver_exercise_series = df.groupby('username')['duration'].mean()
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


def update_time_congestion_statistics(days: int = 30):
    """최근 days일 출석 데이터를 기반으로 헬스장별 시간대 방문 통계 및 혼잡도를 갱신.
    연월 구분 없이 gym_id + hour 기준으로 최신 혼잡도를 덮어쓴다(carry-forward)."""
    with get_conn() as conn, conn.cursor() as cur:
        # 1. 헬스장별 총 회원 수 조회
        cur.execute('SELECT gym_id, COUNT(*) AS member_count FROM "h_member" GROUP BY gym_id')
        gym_members = {row['gym_id']: row['member_count'] for row in cur.fetchall()}

        # 1-b. 헬스장별 '영업일수'(최근 days일 중 출석이 있었던 고유 날짜 수) — 시간대 평균의 분모
        cur.execute('''
            SELECT gym_id, COUNT(DISTINCT check_in::date) AS open_days
            FROM "h_check_inout"
            WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
            GROUP BY gym_id
        ''', (days,))
        gym_open_days = {row['gym_id']: row['open_days'] for row in cur.fetchall()}

        # 2. 최근 days일 헬스장별 시간대별 총 방문 수 조회
        cur.execute('''
            SELECT
                gym_id,
                EXTRACT(HOUR FROM check_in)::INT AS hour,
                COUNT(*) AS total_visits
            FROM "h_check_inout"
            WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
            GROUP BY gym_id, EXTRACT(HOUR FROM check_in)::INT
        ''', (days,))
        rows = cur.fetchall()
        if not rows:
            return

        # 2-b. stale 정리 — 이번 윈도우에 출석이 있는 gym들의 기존 시간대 행을 먼저 삭제.
        #       carry-forward(UPSERT만)로 남던 '안 쓰는 시간대'의 낡은 값 제거 → 아래에서 새로 적재.
        active_gyms = list({row['gym_id'] for row in rows})
        cur.execute('DELETE FROM "h_time_congestion" WHERE gym_id = ANY(%s)', (active_gyms,))

        # 3. 최대 이용 가능 인원(10%) 대비 점유율 기준으로 혼잡도 분류 및 UPSERT
        for row in rows:
            gym_id = row['gym_id']
            hour = row['hour']
            total_visits = row['total_visits']

            # 분모 = 그 gym의 윈도우 내 영업일수(전체 시간대 통틀어 출석 있던 고유 날짜 수).
            #        '그 시간대 방문일수'로 나누면 0인 날이 빠져 모든 시간대가 ~1로 뭉개짐 → gym 영업일수로.
            open_days = gym_open_days.get(gym_id) or 1
            # 영업한 하루당 그 시간대 평균 방문 인원
            daily_avg = total_visits / open_days

            # 헬스장 총 회원수 기반 최대 동시 이용 가능 인원 (10%)
            total_members = gym_members.get(gym_id, 0)
            max_capacity = total_members * 0.1
            if max_capacity <= 0:
                max_capacity = 1.0  # Zero Division 방지

            # 점유율 계산 (일평균 / 최대인원 * 100)
            occupancy_rate = (daily_avg / max_capacity) * 100.0

            # 혼잡도 수준 구분
            if occupancy_rate < 40.0:
                level = '여유'
            elif occupancy_rate < 70.0:
                level = '보통'
            elif occupancy_rate < 90.0:
                level = '혼잡'
            else:
                level = '매우 혼잡'

            # h_time_congestion 에 적재 (gym_id + hour). visit_count = 최근 days일 그 시간대 총 방문 건수(정수).
            #  (daily_avg 는 소수라 BIGINT 컬럼에 못 담음 → 등급 판정용으로만 쓰고, 저장은 총 건수)
            cur.execute('''
                INSERT INTO "h_time_congestion" (gym_id, hour, visit_count, congestion_level)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (gym_id, hour)
                DO UPDATE SET
                    visit_count = EXCLUDED.visit_count,
                    congestion_level = EXCLUDED.congestion_level
            ''', (gym_id, hour, int(total_visits), level))
        conn.commit()


def get_members_time_congestion(days: int = 30) -> dict:
    """최근 days일 기준 회원별 주 방문 시간대 혼잡도를 {username: congestion_level}로 반환.
    (연월 무관 — h_time_congestion을 gym_id + hour 로 조인)"""
    result_map = {}
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            WITH member_hour_visits AS (
                SELECT
                    username,
                    gym_id,
                    EXTRACT(HOUR FROM check_in)::INT AS visit_hour,
                    COUNT(*) AS count,
                    ROW_NUMBER() OVER (PARTITION BY username ORDER BY COUNT(*) DESC, EXTRACT(HOUR FROM check_in)::INT ASC) as rn
                FROM "h_check_inout"
                WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
                GROUP BY username, gym_id, EXTRACT(HOUR FROM check_in)::INT
            )
            SELECT
                mh.username,
                COALESCE(tc.congestion_level, '보통') AS congestion_level
            FROM member_hour_visits mh
            LEFT JOIN "h_time_congestion" tc ON mh.gym_id = tc.gym_id
                                           AND mh.visit_hour = tc.hour
            WHERE mh.rn = 1
        '''
        cur.execute(query, (days,))
        for row in cur.fetchall():
            result_map[row['username']] = row['congestion_level']
    return result_map


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
    
    # 헬스장 혼잡도 통계 테이블 갱신 및 주 이용 시간대 혼잡도 도출
    update_time_congestion_statistics()
    congestion_map = get_members_time_congestion()
    time_cong = congestion_map.get(username, "보통")
    
    # 최근 30일 출결을 바탕으로 주당 방문 횟수 및 일평균 운동시간 계산
    inouts = fetch_recent_inouts(username)
    visit_per_week = calculate_visit_per_week_pandas(inouts, username)
    aver_exercise = calculate_aver_exercise_pandas(inouts, username)
    last_days = calculate_last_days(username)
    
    member = row_to_member(row)
    member["이번달_주당방문횟수"] = visit_per_week
    member["최근한달_일평균_운동시간"] = aver_exercise
    member["마지막_방문_경과일"] = last_days
    member["주_이용_시간대_혼잡도"] = time_cong
    
    return {
        "username": row["username"],
        "contract_type": row["contract_type"],
        "age": int(row["age"]) if row["age"] is not None else None,
        "total_month": int(row["total_month"]) if row["total_month"] is not None else None,
        "pt_yn": 1 if row["pt_yn"] else 0,
        "visit_per_week": visit_per_week,  # 백엔드 기입용
        "aver_exercise": aver_exercise,    # 백엔드 기입용
        "last_days": last_days,            # 백엔드 기입용
        "time_cong": time_cong,            # 백엔드 기입용
        "진단": predict(member),
        "시뮬레이션": simulate(member),
    }


@app.get("/churn")
def churn_gym():
    """헬스장 전체(h_model_data 전 회원) 대시보드 집계."""
    rows = fetch_all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"no rows in {TABLE}")
    
    # 헬스장 혼잡도 통계 테이블 갱신 및 주 이용 시간대 혼잡도 도출
    update_time_congestion_statistics()
    congestion_map = get_members_time_congestion()
    
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
        m["주_이용_시간대_혼잡도"] = congestion_map.get(r["username"], "보통")
        members.append(m)
        
    return predict_gym(members)


# ─────────────────────── 전체 회원 이탈 예측 배치 ───────────────────────
def analyze_and_save_all(days: int = 30, chunk_size: int = 1000) -> dict:
    """전체 회원 이탈 예측을 계산해 h_churn_result 에 일괄 UPSERT (하루 1회 배치용).

    /churn 엔드포인트와 동일하게 회원별 피처를 구성 → predict() 로 진단 →
    위험점수(churn_rate) 와 이탈요인 top3 를 추출 → model_id 기준으로 벌크 UPSERT.
    대량일 때 메모리 보호를 위해 chunk_size 단위로 예측·기입한다.

    ※ h_churn_result.model_id 에 UNIQUE 제약이 있어야 ON CONFLICT 가 동작한다.
    """
    # 0) 출석 기록이 있는데 h_model_data 에 아직 없는 회원을 신규 등록 (skeleton 행: username만)
    #    → 나머지 피처(age/total_month/방문/혼잡도 등)는 아래 fetch_all·피처맵에서 계산됨
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            INSERT INTO "h_model_data" (username)
            SELECT DISTINCT c.username
            FROM "h_check_inout" c
            WHERE NOT EXISTS (
                SELECT 1 FROM "h_model_data" m WHERE m.username = c.username
            )
        ''')
        inserted = cur.rowcount

        # churn(실제 이탈) 갱신 — h_contract_data 에 계약(receiver_id)이 있으면 FALSE, 없으면 TRUE
        cur.execute('''
            UPDATE "h_model_data" m
            SET churn = NOT EXISTS (
                SELECT 1 FROM "h_contract_data" c WHERE c.receiver_id = m.username
            )
        ''')
        conn.commit()

    rows = fetch_all()   # 출석 있는 회원만 반환 (fetch_all 에 EXISTS(h_check_inout) 필터 있음)
    # churn(실제 이탈=계약없음)=TRUE 회원은 예측·피처·통계 갱신 대상에서 제외 → 마지막 상태로 동결
    excluded_churned = sum(1 for r in rows if r.get("churn"))
    rows = [r for r in rows if not r.get("churn")]
    if not rows:
        return {"신규등록": inserted, "이탈제외": excluded_churned,
                "처리": 0, "회원수": 0, "메시지": "예측 대상(활성 출석 회원) 없음"}

    # 1) 혼잡도 통계 갱신 + 배치 피처 맵 (전체 한 번씩만 계산)
    update_time_congestion_statistics(days)
    congestion_map = get_members_time_congestion(days)
    inouts = fetch_recent_inouts()
    visits_map = calculate_all_visit_per_week_pandas(inouts)
    exercise_map = calculate_all_aver_exercise_pandas(inouts)
    last_days_map = calculate_all_last_days()

    upsert_sql = '''
        INSERT INTO "h_churn_result"
            (model_id, churn_rate, top1_reason, top2_reason, top3_reason)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (model_id) DO UPDATE SET
            churn_rate  = EXCLUDED.churn_rate,
            top1_reason = EXCLUDED.top1_reason,
            top2_reason = EXCLUDED.top2_reason,
            top3_reason = EXCLUDED.top3_reason
    '''

    # h_model_data 피처 갱신용 — 예측에 쓰인 계산값을 되돌려 저장(skeleton 행의 NULL 채움)
    feature_sql = '''
        UPDATE "h_model_data" SET
            age = %s, total_month = %s, visit_per_week = %s, aver_exercise = %s,
            pt_yn = %s, time_cong = %s, last_days = %s, contract_type = %s
        WHERE model_id = %s
    '''

    # 2) 청크 단위로 회원별 예측 → h_model_data 피처 갱신 + h_churn_result 벌크 UPSERT
    #    + gym별 일별 통계 tally (분모=회원수 스냅샷 / 분자=회원 top3 요인·불만 집계)
    total = 0
    gym_total = {}       # gym_id -> 회원수 (h_churn_gym_daily.total_members = %의 분모)
    gym_churn_sum = {}   # gym_id -> churn_rate 합 (avg_churn_rate 계산용)
    gym_factor = {}      # (gym_id, 피처키) -> 회원수 (이탈요인 분자)
    gym_complaint = {}   # (gym_id, 불만항목) -> 회원수 (불만이유 분자)
    with get_conn() as conn, conn.cursor() as cur:
        for start in range(0, len(rows), chunk_size):
            result_records = []
            feature_records = []
            for r in rows[start:start + chunk_size]:
                uname = r["username"]
                vpw = visits_map.get(uname, 0.0)
                avex = exercise_map.get(uname, 0.0)
                ldays = last_days_map.get(uname, 999)
                tcong = congestion_map.get(uname, "보통")

                member = row_to_member(r)
                member["이번달_주당방문횟수"] = vpw
                member["최근한달_일평균_운동시간"] = avex
                member["마지막_방문_경과일"] = ldays
                member["주_이용_시간대_혼잡도"] = tcong

                diag = predict(member)
                score = diag.get("위험점수")
                churn_rate = (float(score) / 100.0) if score is not None else None
                risk = diag.get("위험요인_이탈↑") or []
                tops = [risk[i].get("해석") if i < len(risk) and risk[i] else None
                        for i in range(3)]

                result_records.append((r["model_id"], churn_rate, tops[0], tops[1], tops[2]))
                # age/total_month/pt_yn/contract_type 는 fetch_all 이 계약에서 계산한 값(r),
                # visit_per_week/aver_exercise/last_days/time_cong 는 출석 기반 계산값
                feature_records.append((r["age"], r["total_month"], vpw, avex,
                                        r["pt_yn"], tcong, ldays, r["contract_type"],
                                        r["model_id"]))

                # gym별 통계 tally — gym_id 없는 회원(h_member 미매칭)은 집계 제외
                gid = r.get("gym_id")
                if gid is not None:
                    gym_total[gid] = gym_total.get(gid, 0) + 1
                    if churn_rate is not None:
                        gym_churn_sum[gid] = gym_churn_sum.get(gid, 0.0) + churn_rate
                    # 이탈요인: 회원 top3 요인의 '피처키'(컬럼) 집계
                    for f in risk[:3]:
                        key = f.get("컬럼") if f else None
                        if key:
                            gym_factor[(gid, key)] = gym_factor.get((gid, key), 0) + 1
                    # 불만이유: 회원 top3 불만 '항목'(예: 서비스불만_환경불편) 집계
                    for c in (diag.get("예상_불만이유") or [])[:3]:
                        item = c.get("항목") if c else None
                        if item:
                            gym_complaint[(gid, item)] = gym_complaint.get((gid, item), 0) + 1

            cur.executemany(feature_sql, feature_records)   # h_model_data 피처 되돌려 저장
            cur.executemany(upsert_sql, result_records)     # h_churn_result 예측 결과
            conn.commit()
            total += len(result_records)

    # 2-b) gym별 일별 통계 적재 (오늘자 = CURRENT_DATE)
    #      h_churn_gym_daily(분모·이탈율) + h_churn_stat_daily(요인·불만 롱포맷 분자)
    #      %는 저장 안 함 — 조회 시 member_count / total_members 로 계산.
    with get_conn() as conn, conn.cursor() as cur:
        # 같은 날 재실행 대비: 오늘자 롱포맷 통계를 먼저 비우고 재적재(사라진 key 잔존 방지)
        cur.execute('DELETE FROM "h_churn_stat_daily" WHERE stat_date = CURRENT_DATE')

        # (FK 부모 먼저) gym 일별 요약 UPSERT
        gym_daily_records = [
            (gid, cnt, round(gym_churn_sum.get(gid, 0.0) / cnt, 4) if cnt else None)
            for gid, cnt in gym_total.items()
        ]
        cur.executemany('''
            INSERT INTO "h_churn_gym_daily" (gym_id, stat_date, total_members, avg_churn_rate)
            VALUES (%s, CURRENT_DATE, %s, %s)
            ON CONFLICT (gym_id, stat_date) DO UPDATE SET
                total_members  = EXCLUDED.total_members,
                avg_churn_rate = EXCLUDED.avg_churn_rate
        ''', gym_daily_records)

        # 요인·불만 롱포맷 분자 (stat_type: 'factor' | 'complaint')
        stat_records = [(gid, 'factor', key, cnt) for (gid, key), cnt in gym_factor.items()]
        stat_records += [(gid, 'complaint', item, cnt) for (gid, item), cnt in gym_complaint.items()]
        cur.executemany('''
            INSERT INTO "h_churn_stat_daily" (gym_id, stat_date, stat_type, stat_key, member_count)
            VALUES (%s, CURRENT_DATE, %s, %s, %s)
        ''', stat_records)
        conn.commit()

    # 3) 출석이 없어 예측 대상이 아닌 회원의 낡은 결과 행 정리
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            DELETE FROM "h_churn_result"
            WHERE model_id IN (
                SELECT m.model_id FROM "h_model_data" m
                WHERE NOT EXISTS (
                    SELECT 1 FROM "h_check_inout" c WHERE c.username = m.username
                )
            )
        ''')
        deleted = cur.rowcount
        conn.commit()

    return {"신규등록": inserted, "이탈제외": excluded_churned,
            "처리": total, "회원수": len(rows), "정리삭제": deleted,
            "통계_gym수": len(gym_total),
            "통계_요인key수": len(gym_factor), "통계_불만key수": len(gym_complaint)}


@app.post("/churn/batch")
def churn_batch():
    """전체 회원 이탈 예측 결과를 h_churn_result 에 일괄 갱신 (스케줄러/수동 트리거용)."""
    return analyze_and_save_all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("churn:app", host="0.0.0.0", port=8000, reload=False)
