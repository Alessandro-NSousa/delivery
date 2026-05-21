package com.delivery.order.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.delivery.order.domain.Order;

public interface OrderRepository extends JpaRepository<Order, UUID> {

	List<Order> findAllByEstablishmentOwnerIdOrderByCreatedAtDesc(UUID ownerId);

	List<Order> findAllByEstablishmentOwnerIdAndEstablishmentIdOrderByCreatedAtDesc(UUID ownerId, UUID establishmentId);
}