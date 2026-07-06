package com.health.app.member;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class MemberDTO {

    

    private Long username;       // 전화번호 (int8)
    private String password;     // 비밀번호 (varchar)
    private String passwordCheck;// 비밀번호 확인
    private String name;         // 이름 (varchar)
    private String email;        // 이메일 (varchar)
    private String role;         // 역할 권한 (varchar)
    private Long gymId;          // 사업장 정보 번호 (int8)
    private Long contract;       // 계약종류 1=admin/owner 2=owner/trainer 3=owner/member 4=trainer/member 

}
