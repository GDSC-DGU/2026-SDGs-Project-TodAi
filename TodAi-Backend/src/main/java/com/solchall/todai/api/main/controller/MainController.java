package com.solchall.todai.api.main.controller;

import com.solchall.todai.api.main.dto.MainResponse;
import com.solchall.todai.api.main.service.MainService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MainController {

    private final MainService mainService;

    public MainController(MainService mainService) {
        this.mainService = mainService;
    }

    @GetMapping("/main")
    public ResponseEntity<MainResponse> getMainPage() {
        return ResponseEntity.ok(mainService.getMainPage());
    }
}
