package com.health.app.complaint;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintMapper complaintMapper;

    // 건의사항 신규 작성 메서드
    public int create(ComplaintDTO complaintDTO)throws Exception{
        return complaintMapper.create(complaintDTO);
    }

    // 일반 회원의 본인 건의글 조회 메서드
    public List<ComplaintDTO>memberList (Long username)throws Exception{
        return complaintMapper.memberList(username);
    }

    // 사장님의 접수된 건의글 조회 메서드 
    public List <ComplaintDTO>ownerList(Long gymId)throws Exception{
        return complaintMapper.ownerList(gymId);
    }

    // 사장님의 접수된 건의글 처리상태 변경 메서드
    public int update(ComplaintDTO complaintDTO)throws Exception{
        return complaintMapper.update(complaintDTO);
    }
}
