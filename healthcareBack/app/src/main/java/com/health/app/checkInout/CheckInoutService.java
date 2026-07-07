package com.health.app.checkInout;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CheckInoutService {

    @Autowired
    private CheckInoutMapper checkInoutMapper;

    public List<CheckInoutDTO> list(Long username)throws Exception{
        return checkInoutMapper.list(username);
    }
}
