package com.delivery.product.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.delivery.product.domain.Product;
import com.delivery.product.domain.ProductCategory;

public record ProductResponse(
    UUID id,
    UUID establishmentId,
    String name,
    String description,
    ProductCategory category,
    BigDecimal price,
    String imageUrl,
    boolean available,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static ProductResponse from(Product product) {
        return new ProductResponse(
            product.getId(),
            product.getEstablishment().getId(),
            product.getName(),
            product.getDescription(),
            product.getCategory(),
            product.getPrice(),
            product.getImageUrl(),
            product.isAvailable(),
            product.getCreatedAt(),
            product.getUpdatedAt()
        );
    }
}