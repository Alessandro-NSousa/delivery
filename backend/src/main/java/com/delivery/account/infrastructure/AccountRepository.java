package com.delivery.account.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.account.domain.Account;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByAuthSubject(String authSubject);
}