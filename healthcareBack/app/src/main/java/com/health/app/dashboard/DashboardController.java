package com.health.app.dashboard;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private JwtUtill jwtUtill;

    // Authorization 헤더에서 로그인 사용자 정보(아이디/권한) 추출 메서드
    private Claims extractClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    // 역할별 위젯 설정 목록 조회 API 메서드 (잠금 위젯 포함, 최초 조회 시 기본 세트 생성)
    @GetMapping("/widgets")
    public ResponseEntity<?> widgetList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Long username = Long.parseLong(claims.getSubject());
        String role = claims.get("role", String.class);

        List<DashboardDTO> widgets = dashboardService.widgetList(username, role, dashboardService.memberGymId(username));
        return ResponseEntity.ok(widgets);
    }

    // 위젯 표시 여부 토글 API 메서드 (데이터 없는 위젯은 켤 수 없음)
    @PutMapping("/widgets/toggle")
    public ResponseEntity<String> widgetToggle(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody DashboardDTO dashboardDTO) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (dashboardDTO.getWidgetKey() == null || dashboardDTO.getIsActive() == null) {
            return ResponseEntity.badRequest().body("widgetKey와 isActive 값을 입력해 주세요.");
        }

        Long username = Long.parseLong(claims.getSubject());
        int result = dashboardService.widgetToggle(username, dashboardDTO.getWidgetKey(), dashboardDTO.getIsActive());

        if (result > 0) {
            return ResponseEntity.ok("Success");
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("데이터가 없는 위젯은 켤 수 없어요. 데이터가 쌓이면 켤 수 있어요.");
    }

    // 위젯 표시 순서 일괄 변경 API 메서드
    @PutMapping("/widgets/order")
    public ResponseEntity<String> widgetOrderUpdate(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody List<DashboardDTO> widgets) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (widgets == null || widgets.isEmpty()) {
            return ResponseEntity.badRequest().body("변경할 위젯 순서 목록을 입력해 주세요.");
        }

        Long username = Long.parseLong(claims.getSubject());
        int updated = dashboardService.widgetOrderUpdate(username, widgets);

        if (updated > 0) {
            return ResponseEntity.ok("Success");
        }
        return ResponseEntity.badRequest().body("Fail");
    }

    // 활성 위젯 대시보드 데이터 조회 API 메서드 (widgetKey별 집계 데이터)
    @GetMapping("/data")
    public ResponseEntity<?> widgetData(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Long username = Long.parseLong(claims.getSubject());
        String role = claims.get("role", String.class);

        Map<String, Object> data = dashboardService.widgetData(username, role, dashboardService.memberGymId(username));
        return ResponseEntity.ok(data);
    }

}
