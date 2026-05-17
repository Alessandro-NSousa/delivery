package com.delivery.order.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.delivery.account.domain.Account;
import com.delivery.establishment.domain.Establishment;
import com.delivery.product.domain.Product;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Account customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "establishment_id", nullable = false)
    private Establishment establishment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 50)
    private OrderPaymentMethod paymentMethod;

    @Column(name = "change_required", nullable = false)
    private boolean changeRequired;

    @Column(name = "subtotal_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Order() {
    }

    public Order(
        Account customer,
        Establishment establishment,
        OrderPaymentMethod paymentMethod,
        boolean changeRequired
    ) {
        this.id = UUID.randomUUID();
        this.customer = Objects.requireNonNull(customer, "customer nao pode ser nulo");
        this.establishment = Objects.requireNonNull(establishment, "establishment nao pode ser nulo");
        this.status = OrderStatus.PENDING_CONFIRMATION;
        this.paymentMethod = Objects.requireNonNull(paymentMethod, "paymentMethod nao pode ser nulo");
        this.changeRequired = changeRequired;
        this.subtotalAmount = BigDecimal.ZERO;
        this.totalAmount = BigDecimal.ZERO;
    }

    public void addItem(Product product, int quantity) {
        Objects.requireNonNull(product, "product nao pode ser nulo");

        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity deve ser maior que zero");
        }

        if (!product.getEstablishment().getId().equals(establishment.getId())) {
            throw new IllegalArgumentException("Todos os itens do pedido devem pertencer ao mesmo estabelecimento");
        }

        items.add(new OrderItem(this, product, quantity));
        recalculateAmounts();
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Account getCustomer() {
        return customer;
    }

    public Establishment getEstablishment() {
        return establishment;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public OrderPaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public boolean isChangeRequired() {
        return changeRequired;
    }

    public BigDecimal getSubtotalAmount() {
        return subtotalAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public List<OrderItem> getItems() {
        return List.copyOf(items);
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    private void recalculateAmounts() {
        subtotalAmount = items.stream()
            .map(OrderItem::getLineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalAmount = subtotalAmount;
    }
}