package com.health.app.result;

import java.util.List;

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

}
