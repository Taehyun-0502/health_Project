package com.health.app.user;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.health.app.member.MemberDTO;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class UserDTO {

    // h_contract_data 컬럼
    private Long dataId; // 계약 id (int8, PK)
    private Long contract; // 계약종류 h_contract (int8, FK)
    private Long gymId; // 사업장 ID (int8, FK)
    private Long senderId; // 발행자 h_member (int8, FK)
    private Long receiverId; // 수신자 (가입전 null) (int8, FK)
    private String receiverName;

    private String status; // DRAFT/ISSUED/SIGNED/EXPIRED (varchar)
    private LocalDate startDate; // 공통: 시작일 (date)
    private LocalDate endDate; // 공통: 종료일 (date)
    private Long amount; // 공통: 금액 (int8)

    private Double contractRate; // 공통: 요율 수수료/인센티브 (numeric)

    private Integer quantity; // 고유: 총 PT횟수(PT) (int4)

    private LocalDate issueDate; // 발행일 (date)
    private LocalDateTime signedAt; // 서명완료일시 (timestamp - 시각 포함)
    private Long managerId; // PT 담당자
    private LocalDate birthDate; // 수신자 생년월일 (date, 이용권(3)/PT(4) 계약용)
    private Integer avgWorkoutTime; // 하루평균 운동 시간 (int4, 시간 단위, 이용권(3)/PT(4) 계약용)
 

    // h_gym 조인 컬럼 (상세 조회 - 계약서 문서 표시용)
    private String gymName; // 헬스장 상호명

    // 계약 상대방(수신자) 회원 정보 (h_member 조인)
    private MemberDTO member;

    // 조회 조건용 필드 (로그인 사용자 - JWT에서 추출)
    private Long username; // 로그인한 사용자 아이디(전화번호)
    private String role; // 로그인한 사용자 권한 ADMIN/OWNER/TRAINER/MEMBER
}
