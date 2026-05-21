package com.delivery.order.application;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.order.api.CreateOrderRequest;
import com.delivery.order.api.OrderResponse;
import com.delivery.order.domain.Order;
import com.delivery.order.domain.OrderPaymentMethod;
import com.delivery.order.domain.OrderStatus;
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
        Order order = new Order(
            customer,
            establishment,
            request.paymentMethod(),
            request.changeRequired(),
            toDeliveryAddress(request.deliveryAddress())
        );

        for (Map.Entry<UUID, Integer> itemEntry : quantitiesByProductId.entrySet()) {
            order.addItem(productsById.get(itemEntry.getKey()), itemEntry.getValue());
        }

        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public List<OrderResponse> listMine(UUID establishmentId) {
        Account merchant = currentAccountService.requireMerchant();
        List<Order> orders = establishmentId == null
            ? orderRepository.findAllByEstablishmentOwnerIdOrderByCreatedAtDesc(merchant.getId())
            : orderRepository.findAllByEstablishmentOwnerIdAndEstablishmentIdOrderByCreatedAtDesc(
                merchant.getId(),
                establishmentId
            );

        return orders.stream().map(OrderResponse::from).toList();
    }

    @Transactional
    public OrderResponse updateStatus(UUID orderId, OrderStatus status) {
        Account merchant = currentAccountService.requireMerchant();

        if (status == null) {
            throw new BusinessException("Informe o novo status do pedido");
        }

        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido nao encontrado"));

        if (!order.getEstablishment().isOwnedBy(merchant.getId())) {
            throw new AccessDeniedException("Voce nao pode atualizar pedidos de outra loja");
        }

        try {
            order.transitionTo(status);
        } catch (IllegalStateException ex) {
            throw new BusinessException(ex.getMessage());
        }

        return OrderResponse.from(orderRepository.save(order));
    }

    private void validateRequest(CreateOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessException("Informe ao menos um item para finalizar o pedido");
        }

        validateDeliveryAddress(request.deliveryAddress());

        for (CreateOrderRequest.CreateOrderItemRequest item : request.items()) {
            if (item.productId() == null) {
                throw new BusinessException("A sacola possui um item sem produto valido");
            }

            if (item.quantity() == null || item.quantity() <= 0) {
                throw new BusinessException("Quantidade invalida para um ou mais itens da sacola");
            }
        }
    }

    private void validateDeliveryAddress(CreateOrderRequest.DeliveryAddressRequest deliveryAddress) {
        if (deliveryAddress == null) {
            throw new BusinessException("Informe o endereco de entrega para finalizar o pedido");
        }

        if (!deliveryAddress.zipCode().matches("\\d{8}")) {
            throw new BusinessException("Informe um CEP valido para o endereco de entrega");
        }

        if (isBlank(deliveryAddress.street()) ||
            isBlank(deliveryAddress.number()) ||
            isBlank(deliveryAddress.district()) ||
            isBlank(deliveryAddress.city())) {
            throw new BusinessException("Preencha todos os campos obrigatorios do endereco de entrega");
        }

        String state = deliveryAddress.state();
        if (isBlank(state) || state.trim().length() != 2) {
            throw new BusinessException("Informe uma UF valida para o endereco de entrega");
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

    private Address toDeliveryAddress(CreateOrderRequest.DeliveryAddressRequest request) {
        return new Address(
            request.zipCode(),
            request.street().trim(),
            request.number().trim(),
            request.district().trim(),
            request.city().trim(),
            request.state().trim().toUpperCase(),
            isBlank(request.complement()) ? null : request.complement().trim()
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}