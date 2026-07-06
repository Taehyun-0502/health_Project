package com.health.app.complaint;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;


@RestController
@RequestMapping("/complaint/*")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

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
    public ResponseEntity<List<ComplaintDTO>>memberList (@RequestParam("username") Long username)throws Exception{
        List<ComplaintDTO> list= complaintService.memberList(username);
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
