package com.delivery.account.api;

import java.util.UUID;

import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;

public record CurrentAccountResponse(
    UUID id,
    String email,
    String displayName,
    AccountProfile profile
) {

    public static CurrentAccountResponse from(Account account) {
        return new CurrentAccountResponse(
            account.getId(),
            account.getEmail(),
            account.getDisplayName(),
            account.getProfile()
        );
    }
}