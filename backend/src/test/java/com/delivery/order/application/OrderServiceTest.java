package com.delivery.order.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.domain.EstablishmentCategory;
import com.delivery.order.api.CreateOrderRequest;
import com.delivery.order.api.OrderResponse;
import com.delivery.order.domain.Order;
import com.delivery.order.domain.OrderPaymentMethod;
import com.delivery.order.infrastructure.OrderRepository;
import com.delivery.product.domain.Product;
import com.delivery.product.domain.ProductCategory;
import com.delivery.product.infrastructure.ProductRepository;
import com.delivery.shared.domain.BusinessException;
import com.delivery.shared.domain.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CurrentAccountService currentAccountService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void shouldRejectOrderCreationWithoutItems() {
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(),
            OrderPaymentMethod.PIX,
            false,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ao menos um item");
    }

    @Test
    void shouldRejectOrderCreationWithoutDeliveryAddress() {
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(item(UUID.randomUUID(), 1)),
            OrderPaymentMethod.PIX,
            false,
            null
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("endereco de entrega");
    }

    @Test
    void shouldRejectOrderCreationWhenQuantityIsInvalid() {
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(item(UUID.randomUUID(), 0)),
            OrderPaymentMethod.PIX,
            false,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Quantidade invalida");
    }

    @Test
    void shouldRejectOrderCreationWhenCashChangeIsRequestedForPix() {
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(item(UUID.randomUUID(), 1)),
            OrderPaymentMethod.PIX,
            true,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Troco");
    }

    @Test
    void shouldRejectOrderCreationWhenProductDoesNotExist() {
        Product existingProduct = sampleProduct(sampleEstablishment(sampleMerchant()), "X-Burger", new BigDecimal("32.90"), true);
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());
        when(productRepository.findAllById(any())).thenReturn(List.of(existingProduct));

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            existingProduct.getEstablishment().getId(),
            List.of(item(existingProduct.getId(), 1), item(UUID.randomUUID(), 1)),
            OrderPaymentMethod.PIX,
            false,
            deliveryAddress()
        )))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("produtos");
    }

    @Test
    void shouldRejectOrderCreationWhenProductIsUnavailable() {
        Product unavailableProduct = sampleProduct(sampleEstablishment(sampleMerchant()), "Suco", new BigDecimal("8.00"), false);
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());
        when(productRepository.findAllById(any())).thenReturn(List.of(unavailableProduct));

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            unavailableProduct.getEstablishment().getId(),
            List.of(item(unavailableProduct.getId(), 1)),
            OrderPaymentMethod.PIX,
            false,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("indisponiveis");
    }

    @Test
    void shouldRejectOrderCreationWhenProductsBelongToDifferentEstablishments() {
        Product firstProduct = sampleProduct(sampleEstablishment(sampleMerchant()), "X-Burger", new BigDecimal("32.90"), true);
        Product secondProduct = sampleProduct(sampleEstablishment(sampleMerchant()), "Pizza", new BigDecimal("54.90"), true);
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());
        when(productRepository.findAllById(any())).thenReturn(List.of(firstProduct, secondProduct));

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            firstProduct.getEstablishment().getId(),
            List.of(item(firstProduct.getId(), 1), item(secondProduct.getId(), 1)),
            OrderPaymentMethod.CREDIT_CARD,
            false,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("unico estabelecimento");
    }

    @Test
    void shouldRejectOrderCreationWhenEstablishmentDoesNotMatchItems() {
        Product product = sampleProduct(sampleEstablishment(sampleMerchant()), "X-Burger", new BigDecimal("32.90"), true);
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());
        when(productRepository.findAllById(any())).thenReturn(List.of(product));

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(item(product.getId(), 1)),
            OrderPaymentMethod.CASH_ON_DELIVERY,
            true,
            deliveryAddress()
        )))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("estabelecimento selecionado");
    }

    @Test
    void shouldCreateOrderWithServerCalculatedTotal() {
        Product burger = sampleProduct(sampleEstablishment(sampleMerchant()), "X-Burger", new BigDecimal("32.90"), true);
        Product fries = sampleProduct(burger.getEstablishment(), "Batata", new BigDecimal("14.50"), true);
        when(currentAccountService.requireCustomer()).thenReturn(sampleCustomer());
        when(productRepository.findAllById(any())).thenReturn(List.of(burger, fries));
        when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.create(new CreateOrderRequest(
            burger.getEstablishment().getId(),
            List.of(item(burger.getId(), 2), item(fries.getId(), 1)),
            OrderPaymentMethod.CASH_ON_DELIVERY,
            true,
            deliveryAddress()
        ));

        verify(orderRepository).save(any(Order.class));
        assertThat(response.status().name()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(response.subtotalAmount()).isEqualByComparingTo("80.30");
        assertThat(response.totalAmount()).isEqualByComparingTo("80.30");
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).productName()).isEqualTo("X-Burger");
        assertThat(response.items().get(0).quantity()).isEqualTo(2);
        assertThat(response.changeRequired()).isTrue();
        assertThat(response.deliveryAddress().zipCode()).isEqualTo("01310930");
        assertThat(response.deliveryAddress().city()).isEqualTo("Sao Paulo");
    }

    private CreateOrderRequest.CreateOrderItemRequest item(UUID productId, int quantity) {
        return new CreateOrderRequest.CreateOrderItemRequest(productId, quantity);
    }

    private CreateOrderRequest.DeliveryAddressRequest deliveryAddress() {
        return new CreateOrderRequest.DeliveryAddressRequest(
            "01310930",
            "Avenida Paulista",
            "1500",
            "Bela Vista",
            "Sao Paulo",
            "SP",
            "Apto 91"
        );
    }

    private Product sampleProduct(Establishment establishment, String name, BigDecimal price, boolean available) {
        return new Product(
            establishment,
            name,
            name + " descricao",
            ProductCategory.MAIN_COURSE,
            price,
            "https://images.delivery.local/" + name.toLowerCase().replace(' ', '-') + ".jpg",
            available
        );
    }

    private Establishment sampleEstablishment(Account owner) {
        return new Establishment(
            owner,
            "Lanche Bom",
            "Lanche Bom LTDA",
            UUID.randomUUID().toString().replace("-", "").substring(0, 14),
            "11999999999",
            "contato@lanchebom.com",
            EstablishmentCategory.SNACK_BAR,
            "Seg-Dom 18:00-23:30",
            new Address("01001000", "Rua A", "10", "Centro", "Sao Paulo", "SP", "Loja 1")
        );
    }

    private Account sampleCustomer() {
        return new Account("auth0|customer-1", "customer@example.com", "Customer Example", AccountProfile.CUSTOMER);
    }

    private Account sampleMerchant() {
        return new Account("auth0|merchant-1", "merchant@example.com", "Merchant Example", AccountProfile.MERCHANT);
    }
}