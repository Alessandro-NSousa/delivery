package com.delivery.account.domain;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import com.delivery.establishment.domain.Address;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "customer_addresses")
@SuppressWarnings("unused")
public class CustomerAddress {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "label")
    private String label;

    @Column(name = "default_address", nullable = false)
    private boolean defaultAddress;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "zipCode", column = @Column(name = "zip_code", nullable = false, length = 8)),
        @AttributeOverride(name = "street", column = @Column(name = "street", nullable = false)),
        @AttributeOverride(name = "number", column = @Column(name = "street_number", nullable = false, length = 20)),
        @AttributeOverride(name = "district", column = @Column(name = "district", nullable = false)),
        @AttributeOverride(name = "city", column = @Column(name = "city", nullable = false)),
        @AttributeOverride(name = "state", column = @Column(name = "state", nullable = false, length = 2)),
        @AttributeOverride(name = "complement", column = @Column(name = "complement"))
    })
    private Address address;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected CustomerAddress() {
    }

    public CustomerAddress(Account account, String label, boolean defaultAddress, Address address) {
        this.id = UUID.randomUUID();
        this.account = Objects.requireNonNull(account, "account nao pode ser nulo");
        this.label = normalizeLabel(label);
        this.defaultAddress = defaultAddress;
        this.address = Objects.requireNonNull(address, "address nao pode ser nulo");
    }

    public void updateDetails(String label, Address address) {
        this.label = normalizeLabel(label);
        this.address = Objects.requireNonNull(address, "address nao pode ser nulo");
    }

    public void markAsDefault() {
        defaultAddress = true;
    }

    public void clearDefault() {
        defaultAddress = false;
    }

    @SuppressWarnings("unused")
    @PrePersist
    private void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @SuppressWarnings("unused")
    @PreUpdate
    private void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Account getAccount() {
        return account;
    }

    public String getLabel() {
        return label;
    }

    public boolean isDefaultAddress() {
        return defaultAddress;
    }

    public Address getAddress() {
        return address;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    private String normalizeLabel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}