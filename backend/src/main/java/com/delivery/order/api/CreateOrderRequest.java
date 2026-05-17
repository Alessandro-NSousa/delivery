package com.delivery.order.api;

import java.util.List;
import java.util.UUID;

import com.delivery.order.domain.OrderPaymentMethod;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateOrderRequest(
    @NotNull UUID establishmentId,
    @NotEmpty @Valid List<CreateOrderItemRequest> items,
    @NotNull OrderPaymentMethod paymentMethod,
    @NotNull Boolean changeRequired
) {

    public record CreateOrderItemRequest(
        @NotNull UUID productId,
        @NotNull @Min(value = 1, message = "Quantidade deve ser maior que zero") Integer quantity
    ) {
    }
}