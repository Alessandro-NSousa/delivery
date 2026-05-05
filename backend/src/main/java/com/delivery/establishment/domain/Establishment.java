package com.delivery.establishment.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "establishments")
public class Establishment {

    @Id
    private UUID id;

    @Column(name = "trade_name", nullable = false)
    private String tradeName;

    @Column(name = "corporate_name", nullable = false)
    private String corporateName;

    @Column(nullable = false, unique = true, length = 14)
    private String cnpj;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EstablishmentCategory category;

    @Column(name = "opening_hours", nullable = false)
    private String openingHours;

    @Embedded
    private Address address;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Establishment() {
    }

    public Establishment(
        String tradeName,
        String corporateName,
        String cnpj,
        String phone,
        String email,
        EstablishmentCategory category,
        String openingHours,
        Address address
    ) {
        this.id = UUID.randomUUID();
        this.tradeName = tradeName;
        this.corporateName = corporateName;
        this.cnpj = cnpj;
        this.phone = phone;
        this.email = email;
        this.category = category;
        this.openingHours = openingHours;
        this.address = address;
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

    public String getTradeName() {
        return tradeName;
    }

    public String getCorporateName() {
        return corporateName;
    }

    public String getCnpj() {
        return cnpj;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public EstablishmentCategory getCategory() {
        return category;
    }

    public String getOpeningHours() {
        return openingHours;
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
}