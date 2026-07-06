package com.health.app.complaint;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
@Mapper
public interface ComplaintMapper {

    // 건의사항 신규 작성 메서드
    public int create(ComplaintDTO complaintDTO)throws Exception;

    // 일반 회원의 본인 건의글 조회 메서드
    public List<ComplaintDTO>memberList (Long username)throws Exception;

    // 사장님의 접수된 건의글 조회 메서드 
    public List <ComplaintDTO>ownerList(Long gymId)throws Exception;

    // 사장님의 접수된 건의글 처리상태 변경 메서드
    public int update(ComplaintDTO complaintDTO)throws Exception;
}
