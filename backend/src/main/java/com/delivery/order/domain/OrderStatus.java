package com.delivery.order.domain;

public enum OrderStatus {

    PENDING_CONFIRMATION,
    PAYMENT_PENDING,
    PAYMENT_CONFIRMED,
    PREPARING,
    OUT_FOR_DELIVERY,
    DELIVERED
}