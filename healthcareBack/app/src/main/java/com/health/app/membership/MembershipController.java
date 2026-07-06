package com.health.app.membership;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.user.UserDTO;

@RestController
@RequestMapping("/membership/*")
public class MembershipController {

    @Autowired
    private MembershipService membershipService;

    // 일반 회원의 본인 회원권(멤버십) 이용 계약 목록 조회 API
    @GetMapping("list")
    public ResponseEntity<List<UserDTO>> getMyMembership(@RequestParam("username") Long username) throws Exception {
        List<UserDTO> list = membershipService.list(username);
        return ResponseEntity.ok(list);
    }
}
