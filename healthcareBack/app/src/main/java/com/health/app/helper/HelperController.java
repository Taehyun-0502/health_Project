package com.health.app.helper;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 불만 조치 도우미(helper) — 기존 result 패키지에서 분리. URL은 그대로 유지하여 프론트 영향 없음.
@RestController
@RequestMapping("/result")
public class HelperController {

    private final HelperService helperService;

    public HelperController(HelperService helperService) {
        this.helperService = helperService;
    }

    // 그 헬스장 트레이너(직원) 명단 (직원불만: 전문성부족/과도한영업 옆)
    @GetMapping("/stats/helper/trainers")
    public ResponseEntity<List<Map<String, Object>>> helperTrainers(@RequestParam Long gymId) throws Exception {
        return ResponseEntity.ok(helperService.selectTrainers(gymId));
    }

    // 특정 불만(statKey)이 예측된 회원들의 방문 시간대 분포(최빈 순) — 비매너회원 옆
    @GetMapping("/stats/helper/complaintVisitTimes")
    public ResponseEntity<List<Map<String, Object>>> helperComplaintVisitTimes(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period,
            @RequestParam String statKey) throws Exception {
        return ResponseEntity.ok(helperService.selectComplaintVisitSlots(gymId, mode, period, statKey));
    }

    // 특정 불만(statKey)이 예측된 회원들의 담당자(계약 manager_id) 명단 — 전문성부족 옆
    @GetMapping("/stats/helper/complaintManagers")
    public ResponseEntity<List<Map<String, Object>>> helperComplaintManagers(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period,
            @RequestParam String statKey) throws Exception {
        return ResponseEntity.ok(helperService.selectComplaintManagers(gymId, mode, period, statKey));
    }

    // 서비스센터 전체 목록 (기구상태불만 옆 표시용)
    @GetMapping("/stats/helper/serviceCenters")
    public ResponseEntity<List<Map<String, Object>>> helperServiceCenters() throws Exception {
        return ResponseEntity.ok(helperService.selectServiceCenters());
    }

    // 헬퍼 요청 등록 (환경불편 → 헬퍼) — title='헬퍼 요청', status='처리대기' 서버 고정
    @PostMapping("/helper/request")
    public ResponseEntity<?> helperRequest(@RequestBody Map<String, Object> body) throws Exception {
        if (body.get("username") == null) {
            return ResponseEntity.badRequest().body("username 필요");
        }
        Long username = Long.valueOf(String.valueOf(body.get("username")));
        String contents = body.get("contents") == null ? null : String.valueOf(body.get("contents"));
        int n = helperService.insertHelperRequest(username, contents);
        return n > 0 ? ResponseEntity.ok("ok") : ResponseEntity.badRequest().body("등록 실패");
    }
}
