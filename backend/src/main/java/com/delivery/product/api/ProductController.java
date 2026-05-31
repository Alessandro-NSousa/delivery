package com.delivery.product.api;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.delivery.product.application.ProductService;

import jakarta.validation.Valid;

@RestController
@RequestMapping
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping("/api/establishments/{establishmentId}/products")
    public ResponseEntity<ProductResponse> create(
        @PathVariable UUID establishmentId,
        @Valid @RequestBody CreateProductRequest request
    ) {
        ProductResponse response = productService.create(establishmentId, request);
        return ResponseEntity.created(URI.create("/api/establishments/" + establishmentId + "/products/" + response.id())).body(response);
    }

    @GetMapping("/api/public/establishments/{establishmentId}/products")
    public List<ProductResponse> listByEstablishment(@PathVariable UUID establishmentId) {
        return productService.listByEstablishment(establishmentId);
    }

    @GetMapping("/api/me/establishments/{establishmentId}/products")
    public List<ProductResponse> listMineByEstablishment(@PathVariable UUID establishmentId) {
        return productService.listMineByEstablishment(establishmentId);
    }

    @PutMapping("/api/establishments/{establishmentId}/products/{productId}")
    public ProductResponse update(
        @PathVariable UUID establishmentId,
        @PathVariable UUID productId,
        @Valid @RequestBody UpdateProductRequest request
    ) {
        return productService.update(establishmentId, productId, request);
    }

    @DeleteMapping("/api/establishments/{establishmentId}/products/{productId}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID establishmentId, @PathVariable UUID productId) {
        productService.deactivate(establishmentId, productId);
        return ResponseEntity.noContent().build();
    }
}