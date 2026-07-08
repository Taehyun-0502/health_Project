package com.health.app.gym;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GymService {

    @Autowired
    private GymMapper gymMapper;

    //회원가입시 gym_id를 가져오는 메서드
    public List<GymDTO> selectId()throws Exception{
        return gymMapper.selectId();
    }
}
