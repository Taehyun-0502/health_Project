# Haru Health

> 계약과 현장 결제, 정산, 출석을 연결한 헬스장 운영 관리 서비스

저는 4인 팀에서 **결제·매출, 정산·물품, 출석·PT 관리, SSE 알림**을 담당했습니다. 결제 결과가 매출과 계약 상태에 함께 반영되도록 트랜잭션을 구성했고, 정산 중복 생성과 PT 초과 차감은 PostgreSQL의 락과 조건부 UPDATE로 제어했습니다.

**2026.06.29 ~ 2026.07.28 · Java 21 · Spring Boot 3.5 · MyBatis · PostgreSQL/Supabase · React · 미배포**

- **결제:** 사장님이 확정한 결제를 회원의 결제·매출 원장에 기록하고 계약 활성화까지 연결했습니다.
- **정산·출석:** 지점별 advisory lock으로 정산 생성을 직렬화하고, 트레이너가 출석을 확인할 때 PT 사용 횟수를 반영했습니다.
- **후속 쿼리 실험:** 더미 매출 50만 건에서 **날짜 범위 조건과 `(gym_id, pay_date)` 인덱스를 함께 적용해** 월 합계 조회의 실행 시간 중앙값을 **58.526ms → 1.321ms**로 줄였습니다. 로컬 단일 쿼리 측정이며 조건과 결과는 [SQL 측정](#sql-측정)에 정리했습니다.
- **다음 프로젝트에 적용:** 여기서 남긴 인증·알림 처리의 과제를 [댕댕댕](https://github.com/Taehyun-0502/pet_project)에서 JWT 필터와 커밋 후 방송으로 개선했습니다.

## 프로젝트 소개

Haru Health는 관계사 관리자, 헬스장 사장님, 트레이너, 회원이 함께 사용하는 B2B/B2C 서비스입니다. 계약·전자서명, 현장 결제, 매출·정산, 출석·PT 일정과 알림을 제공하며, 팀원들이 이탈 예측과 AI 운영 비서도 구현했습니다.

제가 맡은 기능은 서로의 데이터를 참조하는 경우가 많았습니다. 결제된 계약으로 출석할 수 있어야 하고, 같은 매출을 월 정산에서도 사용해야 했습니다. 그래서 기능을 연결할 때 **어떤 도메인이 데이터를 변경하고, 어디까지 한 번에 성공해야 하는지**를 먼저 정했습니다.

## 기간 · 인원 · 역할

| 항목 | 내용 |
| --- | --- |
| 개발 기간 | 2026.06.29 ~ 2026.07.28 |
| 팀 구성 | 4명 |
| 제 역할 | `payment`, `settle`, `item`, `checkInout`, `alarm`의 Service·Mapper 중심 개발, 관련 API·화면 연동 및 단위 테스트 |
| 팀원과 연결한 영역 | 계약·회원 정보, 전자서명, 역할별 대시보드 |
| 실행 환경 | 로컬 검증, 운영 서버 미배포 |

*팀 개발 코드 기준: `sub` 브랜치 · `fb8c87e`*

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5, Spring MVC, Spring JDBC |
| DB · Data Access | PostgreSQL/Supabase, MyBatis 3 |
| 인증 · 알림 | Spring Security, JWT, BCrypt, SSE (`SseEmitter`) |
| 테스트 | JUnit 5, Mockito, Spring Boot Test |
| Frontend · Build | React 19, Vite, Gradle, npm |

## 아키텍처

```text
React: 관리자·사장님·트레이너·회원 화면 / 출석 키오스크
  │ REST                              ▲ SSE
  ▼                                   │
Spring Boot                           │
  Controller → Service ────────── AlarmService
                  ▲                   │
              Scheduler               │
                  │                   │
               MyBatis ────────────────┘
                  │
                  ▼
           PostgreSQL (Supabase)
```

핵심 업무는 하나의 Spring Boot 애플리케이션과 DB에서 처리합니다. MyBatis로 조회와 집계 SQL을 작성했고, 월 정산과 일정 알림은 Spring Scheduler로 실행했습니다. 알림 연결은 애플리케이션 메모리에서 관리합니다.

## 제가 맡은 도메인

| 영역 | 구현한 내용 |
| --- | --- |
| 결제·매출 | 계약·쿠폰 검증, 결제 확정, 매출 등록·조회·삭제, 계약 활성화 호출 |
| 정산·물품 | 월 커미션 생성, 지급 처리, 매출 삭제 후 재계산, 물품 구매와 지출 연결 |
| 출석·PT | 키오스크 접수, 트레이너 확인, PT 사용량 관리, 일정과 재등록 대상 조회 |
| 알림 | SSE 구독 티켓, 다중 탭 연결, 이력 저장·읽음 처리, 배치 알림 |

계약과 회원 기능은 팀원 담당이었습니다. 저는 해당 데이터를 읽어 업무 조건을 검증하고, 계약 활성화처럼 원본을 변경해야 할 때는 계약 서비스의 메서드를 호출했습니다.

## 결제 트랜잭션

현장 결제에서는 **결제를 확정하는 사람은 사장님이고, 결제 내역의 당사자는 회원**입니다. 저는 로그인한 사장님이 발행한 계약인지 확인하고, 원장에는 계약 수신자인 회원을 기록하도록 구성했습니다. 외부 PG 승인 없이 현장 결제 결과를 기록하는 모델입니다.

`PayService.checkout`의 `@Transactional` 안에서 다음 작업을 수행합니다.

1. 사장님이 발행한 서명 완료·미결제 계약인지 확인합니다.
2. 쿠폰의 소유자, 사용 상태, 만료일, 지점, 적용 가능한 계약 유형을 검증합니다.
3. 할인 한도를 적용한 금액을 `h_pay`에 기록합니다.
4. 쿠폰을 사용 완료로 바꿉니다.
5. `h_payment`에 매출을 기록합니다.
6. 계약 서비스를 호출해 계약을 활성화합니다.

활성화에 실패하면 `IllegalStateException`을 던져 앞선 DB 변경도 롤백되도록 했습니다. 시작일이 미래라면 결제만 완료하고 `SIGNED`를 유지합니다. 이후 계약 조회 시 실행하는 sweep에서 시작일과 결제 이력을 확인해 활성화합니다.

[결제 서비스 코드](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/payment/PayService.java)

## 정산 배치와 동시성

월 정산은 매월 1일 00시, `Asia/Seoul` 기준으로 전월 매출을 집계합니다. 아직 끝나지 않은 현재 월은 정산할 수 없도록 제한했습니다. 집계할 때는 각 결제일에 유효했던 제휴 계약을 `LATERAL`로 조회해 그 시점의 수수료율을 적용합니다.

정산 생성 전에는 잠글 정산 행이 없을 수 있습니다. 저는 지점을 키로 하는 `pg_advisory_xact_lock(gym_id)`를 먼저 획득하고, 같은 지점·월의 정산이 있는지 다시 확인한 뒤 INSERT하도록 했습니다. 이 경로를 사용하는 배치와 수동 요청은 지점별로 순서대로 처리됩니다.

지급 처리에서는 요청 body의 금액을 그대로 저장하지 않고 DB의 정산 금액과 요율을 사용했습니다. 지출 등록 후 아래 조건으로 정산을 갱신하고, 갱신 행 수가 1이 아니면 예외를 발생시킵니다.

```sql
UPDATE h_settlement
SET status = '지급', settled_at = :paid_date, expense_id = :expense_id
WHERE settlement_id = :settlement_id
  AND status = '미지급'
  AND expense_id IS NULL;
```

매출 삭제도 지급 상태에 따라 다르게 처리했습니다. 미지급 정산은 남은 매출과 저장된 요율로 재계산하고, 이미 지급한 정산은 자동 감액하지 않고 확인 알림을 남겼습니다. 물품 구매는 생성된 `item_id`를 지출의 `origin_item_id`에 연결해 구매와 지출을 추적하도록 했습니다.

[정산 서비스](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/settle/SettleService.java) · [정산 SQL](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/settle/SettleMapper.xml)

## PT 사용량 원장

저는 회원의 키오스크 접수와 트레이너의 수업 확인을 분리했습니다. 접수할 때는 미확인 출석만 남기고, 담당 트레이너가 확인할 때 PT 사용 횟수를 반영합니다.

계약 총 횟수는 팀원 담당인 `h_contract_data.quantity`에서 읽습니다. 출석 도메인에서는 계약을 직접 차감하지 않고, 계약당 한 행인 `h_pt_manage`에 사용량을 누적합니다. **PT 확인 시 관리 행을 처음 만들 때 `quantity`를 `total_count`에 복사하고**, 아래 차감 SQL에서는 이 스냅샷을 상한으로 사용합니다. 기존 관리 행은 `ON CONFLICT (data_id) DO NOTHING`으로 유지합니다. 화면의 잔여 횟수는 `quantity - used_count`로 계산합니다.

```sql
UPDATE h_pt_manage
SET used_count = used_count + 1,
    completed = (used_count + 1 >= total_count)
WHERE data_id = :data_id
  AND used_count < total_count;
```

출석 확인과 위 UPDATE를 같은 트랜잭션으로 묶고, 갱신 행 수가 0이면 실패 처리했습니다. 같은 출석을 다시 확인하지 않도록 `trainer_confirm IS NULL` 조건도 사용했습니다. PT와 체험 계약을 함께 가진 경우에는 오래된 계약부터 소진합니다.

[PT 확인 서비스](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/checkInout/CheckInoutService.java) · [PT 차감 SQL](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/checkInout/CheckInoutMapper.xml)

## SSE 알림

정산 생성, PT 접수, 잔여 3회 도달, 다음 날 수업 일정에 알림을 연결했습니다. 접속하지 않은 사용자도 나중에 볼 수 있도록 `h_alarm`에 이력을 저장하고, 연결된 사용자에게 SSE로 전달합니다.

기본 `EventSource`에서 Bearer 헤더를 직접 지정할 수 없어, 인증된 요청으로 **60초 유효한 1회용 티켓**을 발급하도록 했습니다. 구독 시 티켓을 즉시 제거하고, 티켓에 연결된 사용자에게만 채널을 열어 줍니다.

한 사람이 여러 탭을 열었을 때 새 연결이 이전 연결을 덮어쓰지 않도록 사용자별 `Set<SseEmitter>`를 관리했습니다. 전송에 실패한 연결만 정리하고 나머지 연결에는 계속 전송합니다. 읽음 처리도 JWT에서 얻은 수신자와 알림 ID를 함께 조건에 넣었습니다.

[구독 티켓](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/alarm/AlarmTicketStore.java) · [알림 서비스](https://github.com/Taehyun-0502/health_Project/blob/fb8c87e/healthcareBack/app/src/main/java/com/health/app/alarm/AlarmService.java)

## `gym_id`로 지점 데이터 범위 제한

여러 헬스장이 같은 DB를 사용하므로, 제가 맡은 매출·정산·물품 API에서는 클라이언트가 보낸 지점 번호를 신뢰하지 않았습니다. JWT subject로 회원을 다시 조회해 `gym_id`를 결정하고, 등록 값과 조회·변경 조건에 넣었습니다.

예를 들어 매출을 등록할 때는 결제 회원과 계약이 사장님의 지점에 속하는지 확인합니다. 삭제할 때는 `pay_id`와 `gym_id`가 모두 맞아야 합니다. 트레이너의 지출 조회는 같은 지점 안에서도 본인이 수신자인 임금 계약으로 범위를 좁혔습니다.

## SQL 측정

MyBatis를 사용하면서 조인 결과의 행 수와 목록·건수·합계의 조건을 직접 관리했습니다. 같은 계약의 `h_pay`가 여러 건일 때 매출 목록이 중복되는 문제는 `LEFT JOIN LATERAL ... ORDER BY p_id DESC LIMIT 1`로 최신 결제 한 건만 붙여 해결했습니다. 공통 필터는 `<sql>`과 `<include>`로 공유했습니다.

README를 정리하면서 월 필터에 있던 `TO_CHAR(pay_date, 'YYYY-MM')`도 확인했습니다. **2026.10.05 후속 로컬 실험**에서는 매출 50만 건을 만들고, `PaymentMapper.paymentListSum`의 월 합계 조회를 기준으로 날짜 조건과 인덱스를 바꿔 측정했습니다.

```sql
-- 기존 월 조건
AND TO_CHAR(p.pay_date, 'YYYY-MM') = '2026-07'

-- 실험한 범위 조건
AND p.pay_date >= DATE '2026-07-01'
AND p.pay_date <  DATE '2026-08-01'

CREATE INDEX idx_h_payment_gym_date ON h_payment (gym_id, pay_date);
```

PostgreSQL 17.11, Windows 11, i5-12400F 환경에서 지점 50개·지점당 매출 1만 건·2년 분량의 합성 데이터를 사용했습니다. 대상 지점의 2026년 7월 매출은 424건입니다. 각 조건을 두 번 워밍업한 뒤 10회씩 `EXPLAIN (ANALYZE, BUFFERS)`로 측정했고, 아래는 실행 시간의 중앙값입니다.

| 조건 | 매출 테이블 접근 방식 | 실행 시간 |
| --- | --- | ---: |
| `TO_CHAR`, 보조 인덱스 없음 | Parallel Seq Scan | 58.526ms |
| 범위 조건, 보조 인덱스 없음 | Parallel Seq Scan | 58.299ms |
| `TO_CHAR` + `(gym_id, pay_date)` | Bitmap Index Scan → Bitmap Heap Scan, 지점만 인덱스로 제한 | 21.123ms |
| 범위 조건 + `(gym_id, pay_date)` | Bitmap Index Scan → Bitmap Heap Scan, 지점과 날짜를 인덱스로 제한 | **1.321ms** |

인덱스를 추가한 상태에서 날짜 조건까지 바꾸자 중앙값이 **21.123ms → 1.321ms**로 줄었습니다. 실행 계획에서도 인덱스가 가져오는 후보 행이 10,000건에서 424건으로 줄고, 이후 필터에서 버리던 9,576건이 사라졌습니다. 네 조건의 매출 합계는 모두 같았습니다.

warm cache에서 월 매출 합계 쿼리 하나를 비교한 결과입니다.

재현용 SQL·측정 스크립트·40회 실행 계획은 [`benchmark/`](./benchmark) 폴더에 있습니다.

## 테스트와 협업

저는 Mockito로 매출·정산·물품의 서비스 분기를 확인했습니다. 특히 요청의 `gym_id`가 서버 값으로 교체되는지, 다른 지점의 매출을 삭제하지 못하는지, 정산 금액을 변조해도 DB 값을 사용하는지를 테스트했습니다.

저장소에는 Mockito 기반 테스트 클래스 5개와 Spring 컨텍스트 테스트 1개가 있습니다. `concurrentCommissionPaymentIsRejected`는 갱신 결과가 0일 때 예외를 내는 분기를 mock으로 확인합니다. 실제 두 트랜잭션을 동시에 실행하는 테스트는 아닙니다.

| 테스트 | 확인한 내용 |
| --- | --- |
| `ItemControllerTest`, `PaymentControllerTest` | 토큰 누락, 권한 부족, 조회할 수 없는 대상의 응답 |
| `ItemServiceTest`, `PaymentServiceTest` | 서버에서 결정한 지점 사용, 다른 지점의 데이터 변경 차단 |
| `SettleServiceTest` | DB 원본 금액 사용, 지급 상태 변경 실패, 현재 월 조기 정산 차단 |

팀에서는 브랜치 변경을 PR로 통합했습니다. 저는 결제·정산·출석·알림 변경과 관련 테스트를 커밋했고, SQL 공통 조각을 정리하면서 여러 화면의 조건을 맞췄습니다. 계약 담당자와는 출석 쪽에서 원본 계약을 차감하지 않고 PT 관리 테이블에 사용량을 기록하는 방식으로 역할을 나눴습니다.

[테스트 코드](https://github.com/Taehyun-0502/health_Project/tree/fb8c87e/healthcareBack/app/src/test/java/com/health/app) · [지점 검증·테스트 변경](https://github.com/Taehyun-0502/health_Project/commit/c396ae1) · [알림·출석 변경](https://github.com/Taehyun-0502/health_Project/commit/d1638e0) · [PR 통합 이력](https://github.com/Taehyun-0502/health_Project/commit/fb8c87e)

## 프로젝트 구조

```text
health_Project/
├── healthcareBack/app/
│   ├── src/main/java/com/health/app/
│   │   ├── payment/       # 결제·매출
│   │   ├── settle/        # 정산·지출·배치
│   │   ├── item/          # 물품·지출 연결
│   │   ├── checkInout/    # 출석·PT 사용량·일정
│   │   ├── alarm/         # SSE·알림 이력
│   │   ├── contract/     # 팀원: 계약·서명·활성화
│   │   └── ...           # 회원·대시보드·이탈 예측·AI 등
│   ├── src/main/resources/
│   └── src/test/java/
├── healthcareFront/src/  # React 화면
└── healthModel/          # 팀원: 이탈 예측 모델·배치
```

## 한계와 다음 프로젝트에서 바꾼 점

Haru Health에서는 Security를 전역 `permitAll`로 열고 컨트롤러마다 JWT를 직접 파싱했습니다. API를 추가할 때마다 인증 검사를 반복해야 했고, 빠뜨릴 여지도 있었습니다. 또 알림을 업무 트랜잭션 안에서 호출하면서, 예외를 잡는 것과 커밋 시점을 분리하는 것이 다르다는 점을 배웠습니다.

바로 다음에 진행한 **댕댕댕(2026.08~09)**에서는 이 두 가지를 다음과 같이 바꿨습니다.

| Haru Health에서 남긴 과제 | 댕댕댕에서 적용한 방식 |
| --- | --- |
| 전역 `permitAll`과 컨트롤러별 수동 JWT 파싱 | [`OncePerRequestFilter`에서 토큰을 검증하고 `SecurityContext`에 인증 정보 등록](https://github.com/Taehyun-0502/pet_project/blob/sub/pet_backend/src/main/java/com/pet/backend/security/JwtAuthenticationFilter.java) |
| 업무 트랜잭션 안에서 알림 저장·전송 호출 | [채팅 메시지 방송을 `AFTER_COMMIT` 이벤트 리스너에서 처리](https://github.com/Taehyun-0502/pet_project/blob/sub/pet_backend/src/main/java/com/pet/backend/chat/websocket/ChatBroadcaster.java) |

댕댕댕에서는 DB 커밋에 성공한 뒤 채팅 메시지를 방송하도록 바꿨습니다. Haru Health의 SSE에 소급 적용한 변경은 아니지만, 예외 처리에만 의존하던 방식에서 전송 시점 자체를 분리한 경험입니다.

Haru Health를 이어서 개선한다면 다음 순서로 진행하려고 합니다.

1. **실제 DB에서 정합성 검증:** 결제 단계별 실패와 checked exception의 롤백 정책, 동시 결제·중복 출석·PT 확인·정산 배치를 PostgreSQL 통합 테스트로 확인하겠습니다. 동일 계약의 복수 결제 정책과 `(gym_id, settle_month)` 유일성에 맞춰 제약조건과 락을 정리하고, PT 취소·복구는 누적 횟수와 별도로 이력을 남기겠습니다.
2. **인증·알림 경계 정리:** 필터 기반 인증을 적용하고 전체 API의 역할·지점 검사를 통일하겠습니다. PostgreSQL RLS도 추가 방어 수단으로 검토할 대상입니다. 현재 알림은 업무 트랜잭션 안에서 저장·전송하므로, DB 오류를 catch하는 것만으로 업무 커밋을 보장할 수 없습니다. 커밋 후 전송과 재시도·전달 보장을 나눠 설계하겠습니다.
3. **측정 결과 반영과 운영 준비:** SQL 변경과 인덱스는 후속 실험 DB에만 적용했습니다. 실제 데이터 분포와 쓰기 비용을 확인한 뒤 Mapper와 DB migration에 반영하겠습니다. 운영 배포 전에는 단일 인스턴스 메모리에 있는 SSE 티켓·연결 관리와 일부 스케줄러의 시간대 설정도 정리하겠습니다.
