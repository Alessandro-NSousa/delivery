package com.delivery.order.infrastructure;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.order.domain.Order;

public interface OrderRepository extends JpaRepository<Order, UUID> {
}