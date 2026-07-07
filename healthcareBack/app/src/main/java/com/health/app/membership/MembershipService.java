package com.health.app.membership;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.contract.ContractDTO;

@Service
public class MembershipService {

    @Autowired
    private MembershipMapper membershipMapper;

    // 회원의 고유 식별번호(receiver_id) 기반 멤버십 이용 계약 리스트 조회 로직 (UserDTO -> ContractDTO 정정)
    public List<ContractDTO> list(Long username) throws Exception {
        return membershipMapper.list(username);
    }
}
