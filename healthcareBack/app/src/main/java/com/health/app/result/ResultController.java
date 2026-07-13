package com.health.app.result;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/result")
public class ResultController {

    private final ResultService resultService;

    public ResultController(ResultService resultService) {
        this.resultService = resultService;
    }

    // 이탈 모델 분석을 수행하고 DB에 결과를 저장/갱신하는 API
    @PostMapping("/analyze/{dataId}")
    public ResponseEntity<?> analyzeAndSave(@PathVariable Long dataId) {
        try {
            ResultDTO result = resultService.analyzeAndSave(dataId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Analysis failed: " + e.getMessage());
        }
    }

    // 전체 또는 특정 지점 회원에 대해 분석을 돌리고 DB에 저장/갱신하는 일괄 처리 API
    @PostMapping("/analyze/all")
    public ResponseEntity<?> analyzeAndSaveAll(@RequestParam(required = false) Long gymId) {
        try {
            int count = resultService.analyzeAndSaveAll(gymId);
            return ResponseEntity.ok(count); // 리포트용 카운트 직접 리턴
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Batch analysis failed: " + e.getMessage());
        }
    }

    // data_id로 저장된 분석 결과를 조회하는 API
    @GetMapping("/{dataId}")
    public ResponseEntity<ResultDTO> selectByDataId(@PathVariable Long dataId) throws Exception {
        ResultDTO dto = resultService.selectByDataId(dataId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    // 전체 또는 특정 지점의 회원 분석 결과 리스트 조회 API
    @GetMapping("/list")
    public ResponseEntity<List<ResultDTO>> selectAll(@RequestParam(required = false) Long gymId) throws Exception {
        return ResponseEntity.ok(resultService.selectAll(gymId));
    }

    // 헬스장 이탈 통계 — 기간(일별/월별) 목록 + 기간별 이탈율/회원수
    @GetMapping("/stats/periods")
    public ResponseEntity<List<ChurnStatPeriodDTO>> statPeriods(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode) throws Exception {
        return ResponseEntity.ok(resultService.selectStatPeriods(gymId, mode));
    }

    // 헬스장 이탈 통계 — 특정 기간의 요인/불만 항목별 비율
    @GetMapping("/stats/breakdown")
    public ResponseEntity<List<ChurnStatItemDTO>> statBreakdown(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period) throws Exception {
        return ResponseEntity.ok(resultService.selectStatBreakdown(gymId, mode, period));
    }

    // 헬스장 이탈 통계 드릴다운 — 특정 요인/불만을 가진 위험군 회원 명단(+이탈율)
    @GetMapping("/stats/members")
    public ResponseEntity<List<ChurnStatMemberDTO>> statMembers(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period,
            @RequestParam String statType,
            @RequestParam String statKey) throws Exception {
        return ResponseEntity.ok(resultService.selectStatMembers(gymId, mode, period, statType, statKey));
    }

    // 헬스장 이탈 통계 — 특정 기간 위험군 회원 전체 명단 + 이탈이유(top1~3)
    @GetMapping("/stats/riskMembers")
    public ResponseEntity<List<ChurnRiskMemberDTO>> riskMembers(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period) throws Exception {
        return ResponseEntity.ok(resultService.selectRiskMembers(gymId, mode, period));
    }

    // 프로모션 발송용 — 그 헬스장 회원 전체 명단(+이탈율)을 이탈율 높은 순으로
    @GetMapping("/members/byChurn")
    public ResponseEntity<List<ChurnStatMemberDTO>> membersByChurn(@RequestParam Long gymId) throws Exception {
        return ResponseEntity.ok(resultService.selectMembersByChurn(gymId));
    }

    // 불만 조치 도우미 — 그 헬스장 트레이너(직원) 명단 (직원불만: 전문성부족/과도한영업 옆)
    @GetMapping("/stats/helper/trainers")
    public ResponseEntity<List<Map<String, Object>>> helperTrainers(@RequestParam Long gymId) throws Exception {
        return ResponseEntity.ok(resultService.selectTrainers(gymId));
    }

    // 불만 조치 도우미 — 해당 기간 특정 불만(statKey)이 예측된 회원들의 방문 시간대 분포(최빈 순)
    // (예: 서비스불만_비매너회원, 직원불만_과도한영업)
    @GetMapping("/stats/helper/complaintVisitTimes")
    public ResponseEntity<List<Map<String, Object>>> helperComplaintVisitTimes(
            @RequestParam Long gymId,
            @RequestParam(defaultValue = "daily") String mode,
            @RequestParam String period,
            @RequestParam String statKey) throws Exception {
        return ResponseEntity.ok(resultService.selectComplaintVisitSlots(gymId, mode, period, statKey));
    }

}
