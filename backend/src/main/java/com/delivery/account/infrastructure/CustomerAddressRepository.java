package com.delivery.account.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.account.domain.CustomerAddress;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {

    List<CustomerAddress> findAllByAccountIdOrderByCreatedAtAsc(UUID accountId);

    Optional<CustomerAddress> findByAccountIdAndDefaultAddressTrue(UUID accountId);

    Optional<CustomerAddress> findByIdAndAccountId(UUID id, UUID accountId);

    boolean existsByAccountId(UUID accountId);

    Optional<CustomerAddress> findFirstByAccountIdAndIdNotOrderByCreatedAtAsc(UUID accountId, UUID id);
}