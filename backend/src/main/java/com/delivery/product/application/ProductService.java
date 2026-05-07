package com.delivery.product.application;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.infrastructure.EstablishmentRepository;
import com.delivery.product.api.CreateProductRequest;
import com.delivery.product.api.ProductResponse;
import com.delivery.product.domain.Product;
import com.delivery.product.infrastructure.ProductRepository;
import com.delivery.shared.domain.ResourceNotFoundException;

import jakarta.transaction.Transactional;

@Service
@Validated
public class ProductService {

    private final ProductRepository productRepository;
    private final EstablishmentRepository establishmentRepository;

    public ProductService(ProductRepository productRepository, EstablishmentRepository establishmentRepository) {
        this.productRepository = productRepository;
        this.establishmentRepository = establishmentRepository;
    }

    @Transactional
    public ProductResponse create(UUID establishmentId, CreateProductRequest request) {
        Establishment establishment = establishmentRepository.findById(establishmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Estabelecimento nao encontrado"));

        Product product = new Product(
            establishment,
            request.name(),
            request.description(),
            request.category(),
            request.price(),
            request.imageUrl(),
            request.available()
        );

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public List<ProductResponse> listByEstablishment(UUID establishmentId) {
        if (!establishmentRepository.existsById(establishmentId)) {
            throw new ResourceNotFoundException("Estabelecimento nao encontrado");
        }

        return productRepository.findAllByEstablishmentIdOrderByNameAsc(establishmentId).stream()
            .map(ProductResponse::from)
            .toList();
    }
}