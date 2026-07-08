# -*- coding: utf-8 -*-
"""하루 1회 실행용 배치 — 전체 회원 이탈 예측 결과(h_churn_result) 갱신.

스케줄러(Windows 작업 스케줄러 / cron)에서 이 스크립트를 실행한다.
    <venv>/python run_daily_batch.py

FastAPI 서버가 떠 있지 않아도 독립적으로 동작한다(DB에 직접 계산·기입).
"""
import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import churn


def main():
    started = datetime.datetime.now()
    print(f"[{started:%Y-%m-%d %H:%M:%S}] 이탈 예측 배치 시작")
    try:
        result = churn.analyze_and_save_all()
        print(f"[완료] {result}")
    except Exception as e:
        print(f"[에러] 배치 실패: {e}", file=sys.stderr)
        raise
    finally:
        elapsed = (datetime.datetime.now() - started).total_seconds()
        print(f"소요 {elapsed:.1f}s")


if __name__ == "__main__":
    main()
