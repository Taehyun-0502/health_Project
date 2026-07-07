package com.health.app.survey;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/survey")
public class SurveyController {

    private final SurveyService surveyService;

    public SurveyController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    // 설문 데이터 저장 API
    @PostMapping("/create")
    public ResponseEntity<String> create(@RequestBody SurveyDTO surveyDTO) throws Exception {
        int result = surveyService.create(surveyDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        }
        return ResponseEntity.badRequest().body("Fail");
    }

    // 회원 1명의 최신 설문 데이터 조회 API
    @GetMapping("/{username}")
    public ResponseEntity<SurveyDTO> selectByUsername(@PathVariable Long username) throws Exception {
        SurveyDTO dto = surveyService.selectByUsername(username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    // 전체 회원 최신 설문 데이터 조회 API
    @GetMapping("/list")
    public ResponseEntity<List<SurveyDTO>> selectAll() throws Exception {
        return ResponseEntity.ok(surveyService.selectAll());
    }
}
