package com.health.app.result;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    // 이탈 예측(쓰기)은 FastAPI 일일 배치(POST /churn/batch)로 일원화됨.
    // Spring 쪽 재계산(analyze) 경로는 제거 — 조회/통계 API만 유지한다. (CHURN_MODEL_INTENT 3.3)

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

    // 프로모션 발송용 — 특정 이탈요인(statKey, 예: 가격불만)을 가진 위험군 회원 명단
    @GetMapping("/members/byFactor")
    public ResponseEntity<List<ChurnStatMemberDTO>> membersByFactor(
            @RequestParam Long gymId,
            @RequestParam String statKey) throws Exception {
        return ResponseEntity.ok(resultService.selectMembersByFactor(gymId, statKey));
    }

}
