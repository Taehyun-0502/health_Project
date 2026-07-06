package com.health.app.settle;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.user.UserDTO;

@Service
public class SettleService {

    @Autowired
    private SettleMapper settleMapper;

    public int payAdd(PayDTO payDTO) throws Exception {

        return settleMapper.payAdd(payDTO);

    }

    public List<PayDTO> payList() throws Exception {

        return settleMapper.payList();
    }

    public List<UserDTO> unpaidContractList(Long username) throws Exception {
        return settleMapper.unpaidContractList(username);
    }
}
