package com.health.app.complaint;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import com.health.app.config.JwtUtill;
import io.jsonwebtoken.Claims;



@RestController
@RequestMapping("/complaint")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private JwtUtill jwtUtill; // ◀ JWT 유틸리티 주입

    // 건의사항 신규 작성 메서드
    @PostMapping("create")
    public ResponseEntity<String> create(@RequestBody ComplaintDTO complaintDTO)throws Exception{
        int result = complaintService.create(complaintDTO);
        if (result>0){
            return ResponseEntity.ok("건의사항 접수완료");
        }
            return ResponseEntity.badRequest().body("접수 실패");
        
    }

    // 일반 회원의 본인 건의글 조회 메서드
    @GetMapping("memberlist")
    public ResponseEntity<?> memberList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
        
        // 1. 헤더에 실린 JWT 토큰 유무 및 규격 사전 검증
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 2. 토큰 해독을 통한 본인 정보 추출
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        // 3. 추출된 본인 번호로 안전하게 조회
        Long loginUsername = Long.parseLong(claims.getSubject());
        List<ComplaintDTO> list = complaintService.memberList(loginUsername);
        return ResponseEntity.ok(list);
    }

    // 사장님의 접수된 건의글 조회 메서드 
    @GetMapping("ownerlist")
    public ResponseEntity<List<ComplaintDTO>> ownerList(@RequestParam("gymId") Long gymId) throws Exception {
        List<ComplaintDTO> list = complaintService.ownerList(gymId);
        return ResponseEntity.ok(list);
    }
    

    // 사장님의 접수된 건의글 처리상태 변경 메서드
    @PostMapping("status")
    public ResponseEntity<String> update(@RequestBody ComplaintDTO complaintDTO)throws Exception{
        int result = complaintService.update(complaintDTO);
        if(result > 0){
            return ResponseEntity.ok("success");
        }
        return ResponseEntity.badRequest().body("fail");
    }

}
