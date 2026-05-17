package com.delivery.order.application;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.establishment.domain.Establishment;
import com.delivery.order.api.CreateOrderRequest;
import com.delivery.order.api.OrderResponse;
import com.delivery.order.domain.Order;
import com.delivery.order.domain.OrderPaymentMethod;
import com.delivery.order.infrastructure.OrderRepository;
import com.delivery.product.domain.Product;
import com.delivery.product.infrastructure.ProductRepository;
import com.delivery.shared.domain.BusinessException;
import com.delivery.shared.domain.ResourceNotFoundException;

import jakarta.transaction.Transactional;

@Service
@Validated
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CurrentAccountService currentAccountService;

    public OrderService(
        OrderRepository orderRepository,
        ProductRepository productRepository,
        CurrentAccountService currentAccountService
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.currentAccountService = currentAccountService;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        Account customer = currentAccountService.requireCustomer();
        validateRequest(request);
        validatePayment(request.paymentMethod(), request.changeRequired());

        Map<UUID, Integer> quantitiesByProductId = aggregateItems(request.items());
        Map<UUID, Product> productsById = productRepository.findAllById(quantitiesByProductId.keySet()).stream()
            .collect(Collectors.toMap(Product::getId, Function.identity()));

        if (productsById.size() != quantitiesByProductId.size()) {
            throw new ResourceNotFoundException("Um ou mais produtos da sacola nao foram encontrados");
        }

        Establishment establishment = validateProducts(request.establishmentId(), quantitiesByProductId, productsById);
        Order order = new Order(customer, establishment, request.paymentMethod(), request.changeRequired());

        for (Map.Entry<UUID, Integer> itemEntry : quantitiesByProductId.entrySet()) {
            order.addItem(productsById.get(itemEntry.getKey()), itemEntry.getValue());
        }

        return OrderResponse.from(orderRepository.save(order));
    }

    private void validateRequest(CreateOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessException("Informe ao menos um item para finalizar o pedido");
        }

        for (CreateOrderRequest.CreateOrderItemRequest item : request.items()) {
            if (item.productId() == null) {
                throw new BusinessException("A sacola possui um item sem produto valido");
            }

            if (item.quantity() == null || item.quantity() <= 0) {
                throw new BusinessException("Quantidade invalida para um ou mais itens da sacola");
            }
        }
    }

    private void validatePayment(OrderPaymentMethod paymentMethod, boolean changeRequired) {
        if (changeRequired && paymentMethod != OrderPaymentMethod.CASH_ON_DELIVERY) {
            throw new BusinessException("Troco so pode ser solicitado para pagamento na entrega");
        }
    }

    private Map<UUID, Integer> aggregateItems(List<CreateOrderRequest.CreateOrderItemRequest> items) {
        Map<UUID, Integer> quantitiesByProductId = new LinkedHashMap<>();

        for (CreateOrderRequest.CreateOrderItemRequest item : items) {
            quantitiesByProductId.merge(item.productId(), item.quantity(), Integer::sum);
        }

        return quantitiesByProductId;
    }

    private Establishment validateProducts(
        UUID establishmentId,
        Map<UUID, Integer> quantitiesByProductId,
        Map<UUID, Product> productsById
    ) {
        Establishment establishment = null;

        for (UUID productId : quantitiesByProductId.keySet()) {
            Product product = productsById.get(productId);

            if (!product.isAvailable()) {
                throw new BusinessException("A sacola possui produtos indisponiveis");
            }

            if (establishment == null) {
                establishment = product.getEstablishment();
            }

            if (!product.getEstablishment().getId().equals(establishment.getId())) {
                throw new BusinessException("A sacola deve conter produtos de um unico estabelecimento");
            }
        }

        if (establishment == null || !establishment.getId().equals(establishmentId)) {
            throw new BusinessException("Os produtos informados nao pertencem ao estabelecimento selecionado");
        }

        return establishment;
    }
}