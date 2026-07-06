package com.health.app.settle;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/fitb/settle/*")
public class SettleController {

    @Autowired
    private SettleService settleService;

    @PostMapping("payadd")
    public void payAdd(@RequestBody PayDTO payDTO) throws Exception {

    }

    public void payList() throws Exception {

    }
}
