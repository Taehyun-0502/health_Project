package com.health.app.checkInout;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;


@RestController
@RequestMapping("/checkin")
public class CheckInoutController {

    @Autowired
    private CheckInoutService checkInoutService;

    @GetMapping("list")
    public ResponseEntity<List<CheckInoutDTO>> list(@RequestParam("username") Long username) throws Exception{
        List<CheckInoutDTO> li = checkInoutService.list(username);
        return ResponseEntity.ok(li);
    }

}
