# Haru Health 월 매출 합계 조회 측정

2026-10-05에 README 보완 과정에서 수행한 로컬 후속 실험입니다. 운영 DB나 실제 고객 데이터는 사용하지 않았습니다. 전체 API 또는 페이지의 응답 시간을 측정한 결과가 아닙니다.

## 측정 대상

원본은 `PaymentMapper.xml`의 `paymentListSum`과 `paymentFilter`입니다. 회원 ID로 gym_id를 조회하는 스칼라 서브쿼리와 `COALESCE(SUM(pay_price), 0)`를 유지하고, 검색어가 없는 월 필터를 비교했습니다. 테스트 테이블은 이 쿼리에 필요한 구조를 재현한 합성 스키마이며 운영 DDL 복제본이 아닙니다.

## 환경과 방법

- PostgreSQL 17.11 native Windows x64, EDB 공식 바이너리
- Windows 11, Intel Core i5-12400F, 논리 프로세서 12개
- 지점 50개, 지점별 10,000건, 총 500,000건
- 날짜 범위 2025-01-01~2026-12-31, 결정적 산술식으로 분산
- 대상 지점 7, 조회월 2026-07, 해당 매출 424건
- 인덱스가 없는 단계도 `pay_id` 기본키 인덱스는 존재
- `VACUUM ANALYZE` 후 각 조건 2회 워밍업, 10회 측정
- 동일 인덱스 상태에서는 두 날짜 조건의 실행 순서를 번갈아 수행
- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`의 `Execution Time` 사용
- warm cache, 동시 부하 없음, 스캔 방식 강제 설정 없음
- `shared_buffers=128MB`, `work_mem=4MB`, `max_parallel_workers_per_gather=2`, `random_page_cost=4`, `jit=on`
- no-index 단계 이후 인덱스를 생성해 indexed 단계 측정. 인덱스 생성 비용·쓰기 성능은 제외
- 네 조건의 합계가 같은지 스크립트에서 검증

| 조건 | 중앙값 ms | 최소 ms | 최대 ms |
| --- | ---: | ---: | ---: |
| TO_CHAR, 보조 인덱스 없음 | 58.526 | 53.009 | 66.469 |
| 범위 조건, 보조 인덱스 없음 | 58.299 | 54.330 | 66.864 |
| TO_CHAR + 복합 인덱스 | 21.123 | 19.979 | 23.586 |
| 범위 조건 + 복합 인덱스 | 1.321 | 1.293 | 1.639 |

인덱스가 없는 두 조건은 Parallel Seq Scan이었습니다. 인덱스가 있을 때 TO_CHAR 쿼리는 지점의 전체 10,000건을 인덱스로 찾고 9,576건을 필터로 제거했습니다. 범위 조건은 지점·날짜 모두가 Index Cond에 들어가 424건만 찾았습니다. 후자의 실제 계획은 Bitmap Index Scan과 Bitmap Heap Scan입니다.

50개 지점의 데이터가 테이블에 섞여 있고 전체 테이블도 약 52MiB로 작습니다. 캐시·분포·선택도·병렬 실행 비용의 영향을 받으므로 이 배율을 다른 환경이나 전체 서비스에 그대로 적용할 수 없습니다. 쿼리 수정과 인덱스는 이번 실험 DB에만 적용했습니다.

## 재현

PostgreSQL이 로컬 55439 포트에서 실행되고, `haru_bench` 계정이 있는 환경을 기준으로 합니다. 새 전용 DB를 만든 후 아래 명령을 순서대로 실행합니다. PATH에 PostgreSQL 도구와 Python 3이 있어야 합니다. 비밀번호 인증을 사용하는 경우 PostgreSQL의 일반 인증 설정을 사용하세요.

```sh
createdb -h 127.0.0.1 -p 55439 -U haru_bench haru_readme_bench
psql -X -h 127.0.0.1 -p 55439 -U haru_bench -d haru_readme_bench -f setup.sql
python measure.py --psql psql --port 55439 --database haru_readme_bench --user haru_bench
```

`setup.sql`은 기존 테이블을 삭제하지 않습니다. 반드시 빈 전용 DB에서 실행합니다. `measure.py`는 인덱스를 생성하고 같은 폴더의 `results.json`을 새 결과로 덮어씁니다. 재측정은 새 DB에서 시작합니다.

`results.json`에는 쿼리 전문, 환경 설정, 40회의 실행 시간과 전체 JSON 실행 계획이 들어 있습니다. 인덱스 이름은 `idx_h_payment_gym_date`이며 크기는 4,644,864 bytes, 테이블 크기는 54,616,064 bytes였습니다.

참고: [원본 매출 쿼리](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/payment/PaymentMapper.xml), [PostgreSQL 바이너리 배포처](https://www.enterprisedb.com/download-postgresql-binaries)
