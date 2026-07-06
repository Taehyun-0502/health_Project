package com.health.app.settle;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
}
