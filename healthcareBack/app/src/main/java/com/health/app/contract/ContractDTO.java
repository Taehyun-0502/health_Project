package com.health.app.contract;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.health.app.member.MemberDTO;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ContractDTO {

    // h_contract_data 컬럼에 매핑되는 필드
    private Long dataId; // 계약 id (int8, PK)
    private Long contract; // 계약종류 h_contract (int8, FK)
    private Long gymId; // 사업장 ID (int8, FK)
    private Long senderId; // 발행자 h_member (int8, FK)
    private Long receiverId; // 수신자 (가입전 null) (int8, FK)
    private String receiverName;

    private String status; // 상태 흐름 통합: DRAFT/ISSUED/SIGNED/ACTIVE/TERMINATED (EXPIRED 미사용) (varchar)
    private Long previousDataId; // 같은 기본 계약군 교체 갱신 시 이전 계약 연결 (int8)
    private Long relatedDataId; // 기본 계약과 병행하는 PT 체험(5)의 연계 계약 연결 (int8)
    private Long sourceCouponId; // PT 체험(5) 발행에 사용한 체험권 쿠폰 (int8, 동일 체험권 중복 발행 차단용)
    // 만료 여부는 별도 컬럼 없이 status(EXPIRED/TERMINATED)로 일원화
    private LocalDate startDate; // 공통: 시작일 (date)
    private LocalDate endDate; // 공통: 종료일 (date)
    private Long amount; // 공통: 금액 (int8)

    private Double contractRate; // 공통: 요율 수수료/인센티브 (numeric)

    private Integer quantity; // 고유: 총 PT횟수(PT) (int4) - 계약서상 스냅샷, 차감되지 않음
    private Integer remainingCount; // 고유: PT 잔여횟수 (int4) - 서명(ACTIVE 전환) 시 quantity로 초기화

    private LocalDate issueDate; // 발행일 (date)
    private LocalDateTime signedAt; // 서명완료일시 (timestamp - 시각 포함)
    private Long managerId; // PT 담당자
    private LocalDate birthDate; // 수신자 생년월일 (date, 이용권(3)/PT(4) 계약용)
    private Integer avgWorkoutHour; // 하루평균 운동 시간 - 시 (int4, 이용권(3)/PT(4) 계약용)
    private Integer avgWorkoutMinute; // 하루평균 운동 시간 - 분 (int4, 이용권(3)/PT(4) 계약용)

    // h_gym 조인 컬럼 (상세 조회 - 계약서 문서 표시용)
    private String gymName; // 헬스장 상호명

    // 계약 상대방(수신자) 회원 정보 (h_member 조인)
    private MemberDTO member;

    // 조회 조건용 임시 필드 (로그인 사용자 - JWT에서 추출)
    private Long username; // 로그인한 사용자 아이디(전화번호)
    private String role; // 로그인한 사용자 권한 ADMIN/OWNER/TRAINER/MEMBER
    private String keyword; // 리스트 검색어 (이름 또는 username)
}
