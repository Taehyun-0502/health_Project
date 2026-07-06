package com.health.app.user;

import com.health.app.member.MemberDTO;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class UserDTO {

    // h_contract_data 컬럼
    private Long dataId;          // 계약 id (int8, PK)
    private Long contract;        // 계약종류 h_contract (int8, FK)
    private Long gymId;           // 사업장 ID (int8, FK)
    private Long senderId;        // 발행자 h_member (int8, FK)
    private Long receiverId;      // 수신자 (가입전 null) (int8, FK)
    private String receiverName;  // 수신자명 스냅샷 (varchar)
    private String receiverPhone; // 수신자 연락처 (varchar)
    private String status;        // DRAFT/ISSUED/SIGNED/EXPIRED (varchar)
    private String startDate;     // 공통: 시작일 (date)
    private String endDate;       // 공통: 종료일 (date)
    private Long amount;          // 공통: 금액 (int8)
    private String amountType;    // MONTHLY_FEE/SALARY/MEMBERSHIP_PRICE/PT_TOTAL (varchar)
    private Double ratePercent;   // 공통: 요율 수수료/인센티브 (numeric)
    private String billingCycle;  // 공통: 정산-지급 주기 (varchar)
    private String title;         // 고유: 이용권명(MEMBERSHIP) (varchar)
    private Integer quantity;     // 고유: 총 PT횟수(PT) (int4)
    private Long unitPrice;       // 고유: 회당 단가(PT) (int8)
    private Integer validMonths;  // 고유: 유효기간 개월(PT) (int4)
    private String note;          // 고유: 근무형태-시간(TRAINER) (varchar)
    private String issueDate;     // 발행일 (date)
    private String signedAt;      // 서명완료일시 (timestamp)

    // h_contract 조인 컬럼
    private String contractType;  // ADMIN_OWNER/OWNER_TRAINER/OWNER_MEMBER_MEMBERSHIP/OWNER_MEMBER_PT
    private String contractName;  // 계약 이름

    // 계약 상대방(수신자) 회원 정보 (h_member 조인)
    private MemberDTO member;

    // 조회 조건용 필드 (로그인 사용자 - JWT에서 추출)
    private Long username;        // 로그인한 사용자 아이디(전화번호)
    private String role;          // 로그인한 사용자 권한 ADMIN/OWNER/TRAINER/MEMBER
}
