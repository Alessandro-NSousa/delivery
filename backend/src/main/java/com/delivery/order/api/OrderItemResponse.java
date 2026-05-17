package com.delivery.order.api;

import java.math.BigDecimal;
import java.util.UUID;

import com.delivery.order.domain.OrderItem;

public record OrderItemResponse(
    UUID productId,
    String productName,
    BigDecimal unitPrice,
    int quantity,
    BigDecimal lineTotal
) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
            item.getProduct().getId(),
            item.getProductName(),
            item.getUnitPrice(),
            item.getQuantity(),
            item.getLineTotal()
        );
    }
}