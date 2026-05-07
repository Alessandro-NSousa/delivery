package com.delivery.product.api;

import java.math.BigDecimal;

import com.delivery.product.domain.ProductCategory;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateProductRequest(
    @NotBlank String name,
    @NotBlank @Size(max = 1000) String description,
    @NotNull ProductCategory category,
    @NotNull @DecimalMin(value = "0.01", message = "Preco deve ser maior que zero") BigDecimal price,
    @NotBlank String imageUrl,
    @NotNull Boolean available
) {
}