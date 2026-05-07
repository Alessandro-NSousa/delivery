package com.delivery.product.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.product.domain.Product;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findAllByEstablishmentIdOrderByNameAsc(UUID establishmentId);
}