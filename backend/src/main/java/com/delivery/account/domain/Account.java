package com.delivery.account.domain;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    private UUID id;

    @Column(name = "auth_subject", nullable = false, unique = true, length = 200)
    private String authSubject;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountProfile profile;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Account() {
    }

    public Account(String authSubject, String email, String displayName, AccountProfile profile) {
        this.id = UUID.randomUUID();
        this.authSubject = require(authSubject, "authSubject");
        this.email = require(email, "email");
        this.displayName = require(displayName, "displayName");
        this.profile = Objects.requireNonNull(profile, "profile nao pode ser nulo");
    }

    public void syncFromIdentity(String email, String displayName, AccountProfile profile) {
        this.email = require(email, "email");
        this.displayName = require(displayName, "displayName");
        this.profile = Objects.requireNonNull(profile, "profile nao pode ser nulo");
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

    public String getAuthSubject() {
        return authSubject;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public AccountProfile getProfile() {
        return profile;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    private String require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " nao pode ser vazio");
        }

        return value;
    }
}