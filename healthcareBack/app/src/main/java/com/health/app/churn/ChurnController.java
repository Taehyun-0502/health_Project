package com.health.app.churn;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/churn")
public class ChurnController {

    private final ChurnService churnService;

    public ChurnController(ChurnService churnService) {
        this.churnService = churnService;
    }

    // 모델 입력 데이터 저장 API
    @PostMapping("/create")
    public ResponseEntity<String> create(@RequestBody ChurnDTO churnDTO) throws Exception {
        int result = churnService.create(churnDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        }
        return ResponseEntity.badRequest().body("Fail");
    }

    // 회원 1명의 모델 입력 데이터 조회 API
    @GetMapping("/{username}")
    public ResponseEntity<ChurnDTO> selectByUsername(@PathVariable Long username) throws Exception {
        ChurnDTO dto = churnService.selectByUsername(username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    // 전체 회원 모델 입력 데이터 조회 API
    @GetMapping("/list")
    public ResponseEntity<List<ChurnDTO>> selectAll() throws Exception {
        return ResponseEntity.ok(churnService.selectAll());
    }
}
