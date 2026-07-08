package com.health.app.gym;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/gym")
public class GymController {
    @Autowired
    private GymService gymService;

    @GetMapping("selectid")
    public List<GymDTO> selectId()throws Exception{
        return gymService.selectId();
    }



}
