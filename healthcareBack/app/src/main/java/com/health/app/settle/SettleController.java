package com.health.app.settle;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import com.health.app.user.UserDTO;
import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/fitb/settle/*")
public class SettleController {

    @Autowired
    private SettleService settleService;

    @Autowired
    private JwtUtill jwtUtill;

    @PostMapping("payadd")
    public ResponseEntity<?> payAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PayDTO payDTO) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        int result = settleService.payAdd(payDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    @GetMapping("paylist")
    public ResponseEntity<?> payList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<PayDTO> list = settleService.payList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("unpaid-contracts")
    public ResponseEntity<?> unpaidContractList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Long ownerPhone = Long.parseLong(claims.getSubject());
        List<UserDTO> list = settleService.unpaidContractList(ownerPhone);
        return ResponseEntity.ok(list);
    }
}
