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
import numpy as np
import joblib
import shap
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# ─────────────────── 이탈 예측 엔진 (churn_bundle.joblib) ───────────────────
# predict.py 제거 후 추론을 churn.py 내부에 self-contained 로 재구현.
_BUNDLE = joblib.load(os.path.join(HERE, "churn_bundle.joblib"))
_CHURN_MODEL = _BUNDLE["churn_model"]
_CALIB_MODEL = _BUNDLE.get("calib_model")
_FEATURES = _BUNDLE["features"]                                     # 모델 입력 피처 순서(16개)
_CONG_MAP = _BUNDLE.get("cong_map", {"여유": 1, "보통": 2, "혼잡": 3, "매우혼잡": 4})
_TIER_EDGES = _BUNDLE.get("tier_edges", [25, 45, 65])
_TIER_NAMES = _BUNDLE.get("tier_names", ["안정", "관찰", "개입", "긴급"])
_EXPLAINER = shap.TreeExplainer(_CHURN_MODEL)


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
    "survey_id, service_rate1, service_rate2, cost_rate, equip_rate1, equip_rate2, "
    "employee_rate1, employee_rate2, injury_issue"
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
def _norm_cong(v):
    """혼잡도 라벨을 predict.py 의 cong_map 키와 일치하도록 정규화(공백 제거).
    DB(h_time_congestion)는 '매우 혼잡'(공백)으로 저장되지만 모델 cong_map 키는 '매우혼잡'(공백X)."""
    return v.replace(" ", "") if isinstance(v, str) else v


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
        "주_이용_시간대_혼잡도": _norm_cong(r.get("time_cong")),
        "마지막_방문_경과일": r.get("last_days"),
        # 추가 메타데이터
        "gym_id": r.get("gym_id"),
        "gym_name": r.get("gym_name"),
    }

    # survey_id가 있으면 설문 응답값(불만 항목 1~5 + 부상여부)을 모델 피처로 함께 전달.
    # 설문이 없으면(LEFT JOIN NULL) 넣지 않음 → 엔진이 결측(미응답)으로 처리.
    # 부상부위(injury_area)는 모델 피처가 아니므로 조회/전달하지 않음.
    if r.get("survey_id") is not None:
        member.update({
            "서비스불만_비매너회원": r.get("service_rate1"),
            "서비스불만_환경불편": r.get("service_rate2"),
            "가격불만": r.get("cost_rate"),
            "기구불만_기구상태불만": r.get("equip_rate1"),
            "기구불만_기구부족": r.get("equip_rate2"),
            "직원불만_불친절": r.get("employee_rate1"),
            "직원불만_전문성부족": r.get("employee_rate2"),
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
                s.service_rate1,
                s.service_rate2,
                s.cost_rate,
                s.equip_rate1,
                s.equip_rate2,
                s.employee_rate1,
                s.employee_rate2,
                s.injury_issue,
                mem.gym_id,
                g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, service_rate1, service_rate2, cost_rate, equip_rate1, equip_rate2,
                       employee_rate1, employee_rate2, injury_issue
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
                s.service_rate1,
                s.service_rate2,
                s.cost_rate,
                s.equip_rate1,
                s.equip_rate2,
                s.employee_rate1,
                s.employee_rate2,
                s.injury_issue,
                mem.gym_id,
                g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, service_rate1, service_rate2, cost_rate, equip_rate1, equip_rate2,
                       employee_rate1, employee_rate2, injury_issue
                FROM "{SURVEY_TABLE}"
                WHERE username = m.username
                ORDER BY survey_id DESC
                LIMIT 1
            ) s ON TRUE
            WHERE mem.role = 'member'
              AND EXISTS (
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
        # 1. 헬스장별 총 회원 수 조회 (기구 데이터 없는 gym 의 폴백용)
        cur.execute('SELECT gym_id, COUNT(*) AS member_count FROM "h_member" GROUP BY gym_id')
        gym_members = {row['gym_id']: row['member_count'] for row in cur.fetchall()}

        # 1-c. 헬스장별 수용량 = 기구(item_category='기구') item_count 합계 × 1.7
        cur.execute('''
            SELECT gym_id, SUM(item_count) * 1.7 AS capacity
            FROM "h_item"
            WHERE item_category = '기구'
            GROUP BY gym_id
        ''')
        gym_capacity = {row['gym_id']: float(row['capacity']) for row in cur.fetchall() if row['capacity']}

        # 1-b. 헬스장별 '영업일수'(최근 days일 중 출석이 있었던 고유 날짜 수) — 시간대 평균의 분모
        cur.execute('''
            SELECT gym_id, COUNT(DISTINCT check_in::date) AS open_days
            FROM "h_check_inout"
            WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
            GROUP BY gym_id
        ''', (days,))
        gym_open_days = {row['gym_id']: row['open_days'] for row in cur.fetchall()}

        # 2. 최근 days일 헬스장별 시간대별 '동시 이용자 수' 집계.
        #    각 방문의 체류구간 [입장, 입장+운동시간) 이 정시(o'clock) t 를 덮으면 그 시간대에 현재이용자로 카운트.
        #    (예: 18:10 입장 90분 → 퇴장 19:40 → 19시 정시에 현재이용자. 20시엔 아님)
        #    total_present = 윈도우 내 (방문 × 덮는 정시) 합계 → 아래에서 영업일수로 나눠 '평균 동시 이용자'.
        cur.execute('''
            SELECT gym_id, hour, COUNT(*) AS total_present
            FROM (
                SELECT ci.gym_id, EXTRACT(HOUR FROM m)::INT AS hour
                FROM "h_check_inout" ci
                CROSS JOIN LATERAL generate_series(
                        date_trunc('hour', ci.check_in),
                        ci.check_in + make_interval(mins => COALESCE(ci.duration, 0)::int),
                        interval '1 hour') AS m
                WHERE ci.check_in >= CURRENT_DATE - make_interval(days => %s)
                  AND m >= ci.check_in
                  AND m <  ci.check_in + make_interval(mins => COALESCE(ci.duration, 0)::int)
            ) p
            GROUP BY gym_id, hour
        ''', (days,))
        rows = cur.fetchall()
        if not rows:
            return

        # 2-b. stale 정리 — 이번 윈도우에 출석이 있는 gym들의 기존 시간대 행을 먼저 삭제.
        #       carry-forward(UPSERT만)로 남던 '안 쓰는 시간대'의 낡은 값 제거 → 아래에서 새로 적재.
        active_gyms = list({row['gym_id'] for row in rows})
        cur.execute('DELETE FROM "h_time_congestion" WHERE gym_id = ANY(%s)', (active_gyms,))

        # 3. 수용량(기구×1.7) 대비 '평균 동시 이용자' 점유율 기준으로 혼잡도 분류 및 UPSERT
        for row in rows:
            gym_id = row['gym_id']
            hour = row['hour']
            total_present = row['total_present']

            # 분모 = 그 gym의 윈도우 내 영업일수 → 영업한 하루당 그 시간대 '평균 동시 이용자 수'
            open_days = gym_open_days.get(gym_id) or 1
            daily_avg = total_present / open_days

            # 최대 동시 이용 가능 인원 = 기구 수량 합계 × 1.7.
            #   기구 데이터가 없는 헬스장은 기존 방식(회원수 10%)으로 폴백.
            max_capacity = gym_capacity.get(gym_id)
            if not max_capacity or max_capacity <= 0:
                max_capacity = gym_members.get(gym_id, 0) * 0.1
            if max_capacity <= 0:
                max_capacity = 1.0  # Zero Division 방지

            # 점유율 = 평균 동시 이용자 / 최대 수용 인원 * 100
            occupancy_rate = (daily_avg / max_capacity) * 100.0

            # 혼잡도 수준 구분: 여유<50, 보통 50~70, 혼잡 70~90, 매우혼잡 90+
            if occupancy_rate < 50.0:
                level = '여유'
            elif occupancy_rate < 70.0:
                level = '보통'
            elif occupancy_rate < 90.0:
                level = '혼잡'
            else:
                level = '매우 혼잡'

            # h_time_congestion 적재 (gym_id + hour). visit_count = 그 시간대 '평균 동시 이용자 수'(반올림 정수).
            cur.execute('''
                INSERT INTO "h_time_congestion" (gym_id, hour, visit_count, congestion_level)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (gym_id, hour)
                DO UPDATE SET
                    visit_count = EXCLUDED.visit_count,
                    congestion_level = EXCLUDED.congestion_level
            ''', (gym_id, hour, int(round(daily_avg)), level))
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
            result_map[row['username']] = _norm_cong(row['congestion_level'])
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


# ─────────────────── 이탈 예측 (벡터화 · 등급 · SHAP 요인) ───────────────────
def _tier(score):
    """위험점수(0~100) → 등급 (tier_edges/tier_names 기준)."""
    for edge, name in zip(_TIER_EDGES, _TIER_NAMES):
        if score < edge:
            return name
    return _TIER_NAMES[-1]


def _vectorize(member: dict) -> np.ndarray:
    """회원 dict → 모델 입력 피처 벡터(_FEATURES 순서). 결측은 NaN(XGBoost가 처리).
    · 상대_방문공백 = 마지막_방문_경과일 ÷ 평소주기(=7/이번달_주당방문횟수)로 파생.
    · 주_이용_시간대_혼잡도(문자열) → cong_map 코드로 변환."""
    vals = []
    for f in _FEATURES:
        if f == "상대_방문공백":
            rel = member.get("상대_방문공백")
            if rel is None:
                last = member.get("마지막_방문_경과일")
                vpw = member.get("이번달_주당방문횟수")
                if last is None:
                    rel = np.nan
                elif vpw:
                    rel = float(last) * float(vpw) / 7.0
                else:
                    rel = float(last) / 7.0
            vals.append(float(rel) if rel is not None else np.nan)
        elif f == "주_이용_시간대_혼잡도":
            v = _norm_cong(member.get(f))
            vals.append(float(_CONG_MAP[v]) if v in _CONG_MAP else np.nan)
        else:
            v = member.get(f)
            vals.append(float(v) if v is not None else np.nan)
    return np.array(vals, dtype=float)


def _predict_batch(members):
    """회원 dict 리스트 → [(churn_rate(0~1), tier, [이탈요인 컬럼 top3])].
    이탈요인 = SHAP 값이 양수(이탈↑)인 피처 상위 3개(컬럼 이름)."""
    X = np.vstack([_vectorize(m) for m in members])
    proba = (_CALIB_MODEL.predict_proba(X) if _CALIB_MODEL is not None
             else _CHURN_MODEL.predict_proba(X))
    probs = proba[:, 1]
    sv = np.asarray(_EXPLAINER.shap_values(X))
    if sv.ndim == 3:            # (classes, n, features) 형태면 양성 클래스 선택
        sv = sv[-1]
    out = []
    for i in range(len(members)):
        score = float(probs[i]) * 100.0
        order = np.argsort(-sv[i])                       # 기여도 큰 순
        tops = [_FEATURES[j] for j in order if sv[i][j] > 0][:3]
        out.append((float(probs[i]), _tier(score), tops))
    return out


# ─────────────────────── 전체 회원 이탈 예측 배치 ───────────────────────
def analyze_and_save_all(days: int = 30, chunk_size: int = 1000) -> dict:
    """전체 회원 이탈 예측 → h_churn_result 일별 INSERT(이력 누적) (하루 1회 배치).
    username·churn_date(CURRENT_DATE)·churn_rate·top1~3_reason 저장. 같은 날 재실행 시 오늘자 삭제 후 재적재.
    gym/요인 통계는 별도 테이블 없이 조회 시 이 테이블에서 파생(위험군=churn_rate>=0.45).
    top1~3_reason = 가장 큰 이탈요인 top3(컬럼 이름). 불만 예측(complaint)은 없음."""
    # 0) 출석 있는 신규 회원 skeleton 등록 + churn(실제 이탈) 동기화
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            INSERT INTO "h_model_data" (username)
            SELECT DISTINCT c.username FROM "h_check_inout" c
            WHERE NOT EXISTS (SELECT 1 FROM "h_model_data" m WHERE m.username = c.username)
              AND EXISTS (SELECT 1 FROM "h_member" mem WHERE mem.username = c.username AND mem.role = 'member')
        ''')
        inserted = cur.rowcount
        cur.execute('''
            UPDATE "h_model_data" m SET churn = (mem.status = '이탈')
            FROM "h_member" mem WHERE m.username = mem.username AND mem.status IN ('이용중', '이탈')
        ''')
        conn.commit()

    rows = fetch_all()
    excluded_churned = sum(1 for r in rows if r.get("churn"))
    rows = [r for r in rows if not r.get("churn")]
    if not rows:
        return {"신규등록": inserted, "이탈제외": excluded_churned, "처리": 0, "회원수": 0,
                "메시지": "예측 대상(활성 출석 회원) 없음"}

    update_time_congestion_statistics(days)
    congestion_map = get_members_time_congestion(days)
    inouts = fetch_recent_inouts()
    visits_map = calculate_all_visit_per_week_pandas(inouts)
    exercise_map = calculate_all_aver_exercise_pandas(inouts)
    last_days_map = calculate_all_last_days()

    # 매일 INSERT(이력 누적) — username + churn_date(CURRENT_DATE) 저장. result_id는 identity 자동 채번.
    insert_sql = '''
        INSERT INTO "h_churn_result" (username, churn_rate, top1_reason, top2_reason, top3_reason, churn_date)
        VALUES (%s, %s, %s, %s, %s, CURRENT_DATE)
    '''
    feature_sql = '''
        UPDATE "h_model_data" SET age=%s, total_month=%s, visit_per_week=%s, aver_exercise=%s,
            pt_yn=%s, time_cong=%s, last_days=%s, contract_type=%s WHERE model_id=%s
    '''

    total = 0
    risk_count = 0
    gyms_seen = set()
    RISK_TIERS = {"개입", "긴급"}
    with get_conn() as conn, conn.cursor() as cur:
        # 같은 날 재실행 시 중복 방지 — 오늘자(churn_date=CURRENT_DATE) 결과부터 지우고 새로 적재
        cur.execute('DELETE FROM "h_churn_result" WHERE churn_date = CURRENT_DATE')
        conn.commit()
        for start in range(0, len(rows), chunk_size):
            chunk = rows[start:start + chunk_size]
            members, metas = [], []
            for r in chunk:
                uname = r["username"]
                vpw = visits_map.get(uname, 0.0)
                avex = exercise_map.get(uname, 0.0)
                ldays = last_days_map.get(uname, 999)
                tcong = congestion_map.get(uname, "보통")
                m = row_to_member(r)
                m["이번달_주당방문횟수"] = vpw
                m["일평균_운동시간"] = avex
                m["마지막_방문_경과일"] = ldays
                m["주_이용_시간대_혼잡도"] = tcong
                members.append(m)
                metas.append((r, vpw, avex, ldays, tcong))

            preds = _predict_batch(members)
            result_records, feature_records = [], []
            for (r, vpw, avex, ldays, tcong), (churn_rate, tier, tops) in zip(metas, preds):
                t = [tops[k] if k < len(tops) else None for k in range(3)]
                result_records.append((r["username"], churn_rate, t[0], t[1], t[2]))
                feature_records.append((r["age"], r["total_month"], vpw, avex,
                                        r["pt_yn"], tcong, ldays, r["contract_type"], r["model_id"]))
                if tier in RISK_TIERS:
                    risk_count += 1
                gid = r.get("gym_id")
                if gid is not None:
                    gyms_seen.add(gid)

            cur.executemany(feature_sql, feature_records)
            cur.executemany(insert_sql, result_records)
            conn.commit()
            total += len(result_records)

    # gym/요인 통계는 별도 테이블 없이 조회 시 h_churn_result(username·churn_rate·top1~3_reason·churn_date)에서 파생.
    # (위험군 = churn_rate >= 0.45, tier_edges[45]/100 과 일치)

    # 출석 없어진 회원의 낡은 결과 정리
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            DELETE FROM "h_churn_result" WHERE username IN (
                SELECT m.username FROM "h_model_data" m
                WHERE NOT EXISTS (SELECT 1 FROM "h_check_inout" c WHERE c.username = m.username))
        ''')
        deleted = cur.rowcount
        conn.commit()

    return {"신규등록": inserted, "이탈제외": excluded_churned, "처리": total, "회원수": len(rows),
            "정리삭제": deleted, "gym수": len(gyms_seen), "위험군수": risk_count}


@app.post("/churn/batch")
def churn_batch():
    """전체 회원 이탈 예측 결과를 h_churn_result 에 일괄 갱신 (스케줄러/수동 트리거용)."""
    return analyze_and_save_all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("churn:app", host="0.0.0.0", port=8000, reload=False)
