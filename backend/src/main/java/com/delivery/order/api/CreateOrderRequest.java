package com.delivery.order.api;

import java.util.List;
import java.util.UUID;

import com.delivery.order.domain.OrderPaymentMethod;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
    @NotNull UUID establishmentId,
    @NotEmpty @Valid List<CreateOrderItemRequest> items,
    @NotNull OrderPaymentMethod paymentMethod,
    @NotNull Boolean changeRequired,
    @NotNull @Valid DeliveryAddressRequest deliveryAddress
) {

    public record CreateOrderItemRequest(
        @NotNull UUID productId,
        @NotNull @Min(value = 1, message = "Quantidade deve ser maior que zero") Integer quantity
    ) {
    }

    public record DeliveryAddressRequest(
        @NotBlank @Pattern(regexp = "\\d{8}", message = "CEP deve conter 8 digitos") String zipCode,
        @NotBlank String street,
        @NotBlank String number,
        @NotBlank String district,
        @NotBlank String city,
        @NotBlank @Size(min = 2, max = 2, message = "UF deve ter 2 caracteres") String state,
        String complement
    ) {
    }
}