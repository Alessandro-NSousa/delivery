package com.delivery.order.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.delivery.order.domain.Order;
import com.delivery.order.domain.OrderPaymentMethod;
import com.delivery.order.domain.OrderStatus;

public record OrderResponse(
    UUID id,
    UUID customerId,
    UUID establishmentId,
    OrderStatus status,
    OrderPaymentMethod paymentMethod,
    boolean changeRequired,
    BigDecimal subtotalAmount,
    BigDecimal totalAmount,
    List<OrderItemResponse> items,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getCustomer().getId(),
            order.getEstablishment().getId(),
            order.getStatus(),
            order.getPaymentMethod(),
            order.isChangeRequired(),
            order.getSubtotalAmount(),
            order.getTotalAmount(),
            order.getItems().stream().map(OrderItemResponse::from).toList(),
            order.getCreatedAt(),
            order.getUpdatedAt()
        );
    }
}