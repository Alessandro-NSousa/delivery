package com.delivery.product.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.domain.EstablishmentCategory;
import com.delivery.establishment.infrastructure.EstablishmentRepository;
import com.delivery.product.api.CreateProductRequest;
import com.delivery.product.api.ProductResponse;
import com.delivery.product.domain.Product;
import com.delivery.product.domain.ProductCategory;
import com.delivery.product.infrastructure.ProductRepository;
import com.delivery.shared.domain.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private EstablishmentRepository establishmentRepository;

    @Mock
    private CurrentAccountService currentAccountService;

    @InjectMocks
    private ProductService productService;

    @Test
    void shouldRejectProductCreationWhenEstablishmentDoesNotExist() {
        UUID establishmentId = UUID.randomUUID();
        when(currentAccountService.requireMerchant()).thenReturn(sampleMerchant());
        when(establishmentRepository.findById(establishmentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.create(establishmentId, sampleRequest()))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Estabelecimento");
    }

    @Test
    void shouldRejectProductCreationForAnotherMerchant() {
        Account currentMerchant = sampleMerchant();
        Establishment establishment = sampleEstablishment(sampleOtherMerchant());
        when(currentAccountService.requireMerchant()).thenReturn(currentMerchant);
        when(establishmentRepository.findById(establishment.getId())).thenReturn(Optional.of(establishment));

        assertThatThrownBy(() -> productService.create(establishment.getId(), sampleRequest()))
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("outra loja");
    }

    @Test
    void shouldPersistProductForExistingEstablishment() {
        Account merchant = sampleMerchant();
        Establishment establishment = sampleEstablishment(merchant);
        CreateProductRequest request = sampleRequest();
        when(currentAccountService.requireMerchant()).thenReturn(merchant);
        when(establishmentRepository.findById(establishment.getId())).thenReturn(Optional.of(establishment));
        when(productRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.create(establishment.getId(), request);

        verify(productRepository).save(any(Product.class));
        assertThat(response.name()).isEqualTo(request.name());
        assertThat(response.establishmentId()).isEqualTo(establishment.getId());
    }

    @Test
    void shouldListProductsByEstablishment() {
        Establishment establishment = sampleEstablishment(sampleMerchant());
        when(establishmentRepository.existsById(establishment.getId())).thenReturn(true);
        when(productRepository.findAllByEstablishmentIdOrderByNameAsc(establishment.getId()))
            .thenReturn(List.of(new Product(
                establishment,
                "X-Burger",
                "Hamburguer artesanal com queijo",
                ProductCategory.MAIN_COURSE,
                new BigDecimal("32.90"),
                "https://images.delivery.local/x-burger.jpg",
                true
            )));

        List<ProductResponse> products = productService.listByEstablishment(establishment.getId());

        assertThat(products).hasSize(1);
        assertThat(products.get(0).name()).isEqualTo("X-Burger");
    }

    private CreateProductRequest sampleRequest() {
        return new CreateProductRequest(
            "X-Burger",
            "Hamburguer artesanal com queijo",
            ProductCategory.MAIN_COURSE,
            new BigDecimal("32.90"),
            "https://images.delivery.local/x-burger.jpg",
            true
        );
    }

    private Establishment sampleEstablishment(Account owner) {
        return new Establishment(
            owner,
            "Lanche Bom",
            "Lanche Bom LTDA",
            "12345678000190",
            "11999999999",
            "contato@lanchebom.com",
            EstablishmentCategory.SNACK_BAR,
            "Seg-Dom 18:00-23:30",
            new Address("01001000", "Rua A", "10", "Centro", "Sao Paulo", "SP", "Loja 1")
        );
    }

    private Account sampleMerchant() {
        return new Account("auth0|merchant-1", "merchant@example.com", "Merchant Example", AccountProfile.MERCHANT);
    }

    private Account sampleOtherMerchant() {
        return new Account("auth0|merchant-2", "other@example.com", "Other Merchant", AccountProfile.MERCHANT);
    }
}