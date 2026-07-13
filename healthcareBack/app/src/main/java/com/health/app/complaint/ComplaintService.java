package com.health.app.complaint;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // ◀ 트랜잭션 임포트
import com.health.app.member.MemberService; // ◀ 회원 서비스 임포트
import com.health.app.member.MemberDTO;     // ◀ 회원 DTO 임포트
import com.health.app.alarm.AlarmService;   // ◀ 알림 서비스 임포트

@Service
public class ComplaintService {

    @Autowired
    private ComplaintMapper complaintMapper;

    @Autowired
    private MemberService memberService; // ◀ 회원 서비스 주입

    @Autowired
    private AlarmService alarmService;   // ◀ 알림 서비스 주입

    // 건의사항 신규 작성 메서드 (작성 시 해당 지점 사장님에게 실시간 알림 발송)
    @Transactional
    public int create(ComplaintDTO complaintDTO) throws Exception {
        int result = complaintMapper.create(complaintDTO);
        
        // 글 등록이 성공했을 경우 해당 지점의 사장님을 색출하여 실시간 알림 발송
        if (result > 0) {
            MemberDTO owner = memberService.findOwnerByGymId(complaintDTO.getGymId());
            if (owner != null) {
                alarmService.sendAlarm(
                    owner.getUsername(),                                                // 수신 사장님
                    complaintDTO.getUsername(),                                         // 발신 일반회원
                    "새로운 건의사항이 등록되었습니다: " + complaintDTO.getTitle(),       // 메시지 내용
                    "/fitb/b2bmypage/b2bcomplaint",                                     // 사장님 건의 확인 페이지
                    "COMPLAINT"                                                         // 구분값
                );
            }
        }
        return result;
    }

    // 일반 회원의 본인 건의글 조회 메서드
    public List<ComplaintDTO>memberList (Long username)throws Exception{
        return complaintMapper.memberList(username);
    }

    // 사장님의 접수된 건의글 조회 메서드 
    public List <ComplaintDTO>ownerList(Long gymId)throws Exception{
        return complaintMapper.ownerList(gymId);
    }

    // 사장님의 접수된 건의글 처리상태 변경 메서드 (변경 성공 시 작성한 회원에게 실시간 알림 발송)
    @Transactional
    public int update(ComplaintDTO complaintDTO) throws Exception {
        // 알림 수신 대상(글쓴이) 확보를 위해 상태 변경 전 원본글 정보 사전 확보
        ComplaintDTO original = complaintMapper.getComplaintById(complaintDTO.getComplaintId());
        
        int result = complaintMapper.update(complaintDTO);
        
        // 상태값 갱신 성공 시 원본 글 작성자 회원에게 실시간 피드백 알림 발송
        if (result > 0 && original != null) {
            MemberDTO owner = memberService.findOwnerByGymId(original.getGymId());
            Long senderId = owner != null ? owner.getUsername() : null;

            alarmService.sendAlarm(
                original.getUsername(),                                                         // 수신 일반회원
                senderId,                                                                       // 발신 사장님
                "보내신 건의사항의 처리 상태가 [" + complaintDTO.getStatus() + "](으)로 변경되었습니다.", // 메시지 내용
                "/fitc/mypage/b2ccomplaint",                                                    // 회원 건의 조회 페이지
                "COMPLAINT"                                                                     // 구분값
            );
        }
        return result;
    }
}

