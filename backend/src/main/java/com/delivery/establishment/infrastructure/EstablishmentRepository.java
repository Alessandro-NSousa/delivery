package com.delivery.establishment.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.establishment.domain.Establishment;

public interface EstablishmentRepository extends JpaRepository<Establishment, UUID> {

    boolean existsByCnpj(String cnpj);

    List<Establishment> findAllByOwnerIdOrderByTradeNameAsc(UUID ownerId);
}