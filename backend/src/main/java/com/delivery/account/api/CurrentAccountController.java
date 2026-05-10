package com.delivery.account.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.delivery.account.application.CurrentAccountService;

@RestController
@RequestMapping("/api/me")
public class CurrentAccountController {

    private final CurrentAccountService currentAccountService;

    public CurrentAccountController(CurrentAccountService currentAccountService) {
        this.currentAccountService = currentAccountService;
    }

    @GetMapping
    public CurrentAccountResponse getCurrentAccount() {
        return CurrentAccountResponse.from(currentAccountService.getCurrentAccount());
    }
}