package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 이탈 통계 드릴다운 — 특정 요인/불만을 가진 위험군 회원 1명
@Getter
@Setter
@ToString
public class ChurnStatMemberDTO {

    private Long username;       // 회원 전화번호(ID)
    private String name;         // 회원 이름
    private Double churnRate;    // 그 회원의 이탈율(0~1)
    private Long lastDays;       // 최근 출석 경과일(현재-마지막 check_in). 방문 공백 요인 '오늘 출석(=0)' 집계용. 출석 없으면 null

}
