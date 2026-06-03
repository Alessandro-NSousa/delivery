package com.delivery.order.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.delivery.account.domain.Account;
import com.delivery.establishment.domain.Address;
import com.delivery.order.domain.Order;
import com.delivery.order.domain.OrderPaymentMethod;
import com.delivery.order.domain.OrderStatus;

public record OrderResponse(
    UUID id,
    UUID customerId,
    CustomerSummaryResponse customer,
    UUID establishmentId,
    OrderStatus status,
    OrderPaymentMethod paymentMethod,
    boolean changeRequired,
    BigDecimal subtotalAmount,
    BigDecimal totalAmount,
    DeliveryAddressResponse deliveryAddress,
    List<OrderItemResponse> items,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getCustomer().getId(),
            CustomerSummaryResponse.from(order.getCustomer()),
            order.getEstablishment().getId(),
            order.getStatus(),
            order.getPaymentMethod(),
            order.isChangeRequired(),
            order.getSubtotalAmount(),
            order.getTotalAmount(),
            DeliveryAddressResponse.from(order.getDeliveryAddress()),
            order.getItems().stream().map(OrderItemResponse::from).toList(),
            order.getCreatedAt(),
            order.getUpdatedAt()
        );
    }

    public record CustomerSummaryResponse(
        String displayName,
        String email
    ) {

        public static CustomerSummaryResponse from(Account account) {
            if (account == null) {
                return null;
            }

            return new CustomerSummaryResponse(account.getDisplayName(), account.getEmail());
        }
    }

    public record DeliveryAddressResponse(
        String zipCode,
        String street,
        String number,
        String district,
        String city,
        String state,
        String complement
    ) {

        public static DeliveryAddressResponse from(Address address) {
            if (address == null) {
                return null;
            }

            return new DeliveryAddressResponse(
                address.getZipCode(),
                address.getStreet(),
                address.getNumber(),
                address.getDistrict(),
                address.getCity(),
                address.getState(),
                address.getComplement()
            );
        }
    }
}