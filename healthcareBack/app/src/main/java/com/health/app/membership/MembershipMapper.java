package com.health.app.membership;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.health.app.contract.ContractDTO;

@Mapper
public interface MembershipMapper {

    // 일반 회원의 본인 회원권(멤버십) 이용 계약 목록 조회 (UserDTO -> ContractDTO 정정)
    public List<ContractDTO> list(Long username) throws Exception;
}
