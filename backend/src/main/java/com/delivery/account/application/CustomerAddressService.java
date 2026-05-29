package com.delivery.account.application;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.delivery.account.api.CreateCustomerAddressRequest;
import com.delivery.account.api.CustomerAddressResponse;
import com.delivery.account.api.UpdateCustomerAddressRequest;
import com.delivery.account.domain.Account;
import com.delivery.account.domain.CustomerAddress;
import com.delivery.account.infrastructure.CustomerAddressRepository;
import com.delivery.establishment.domain.Address;
import com.delivery.shared.domain.ResourceNotFoundException;

import jakarta.transaction.Transactional;

@Service
@Validated
public class CustomerAddressService {

    private final CustomerAddressRepository customerAddressRepository;
    private final CurrentAccountService currentAccountService;

    public CustomerAddressService(
        CustomerAddressRepository customerAddressRepository,
        CurrentAccountService currentAccountService
    ) {
        this.customerAddressRepository = customerAddressRepository;
        this.currentAccountService = currentAccountService;
    }

    @Transactional
    public List<CustomerAddressResponse> listMine() {
        Account customer = currentAccountService.requireCustomer();

        return customerAddressRepository.findAllByAccountIdOrderByCreatedAtAsc(customer.getId()).stream()
            .map(CustomerAddressResponse::from)
            .toList();
    }

    @Transactional
    public CustomerAddressResponse create(CreateCustomerAddressRequest request) {
        Account customer = currentAccountService.requireCustomer();
        boolean firstAddress = !customerAddressRepository.existsByAccountId(customer.getId());
        boolean defaultAddress = request.defaultAddress() || firstAddress;

        if (defaultAddress && !firstAddress) {
            clearCurrentDefault(customer.getId());
        }

        CustomerAddress customerAddress = new CustomerAddress(
            customer,
            request.label(),
            defaultAddress,
            toAddress(request)
        );

        return CustomerAddressResponse.from(customerAddressRepository.save(customerAddress));
    }

    @Transactional
    public CustomerAddressResponse update(UUID addressId, UpdateCustomerAddressRequest request) {
        Account customer = currentAccountService.requireCustomer();
        CustomerAddress customerAddress = customerAddressRepository.findByIdAndAccountId(addressId, customer.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Endereco salvo nao encontrado"));

        customerAddress.updateDetails(request.label(), toAddress(request));

        return CustomerAddressResponse.from(customerAddressRepository.save(customerAddress));
    }

    @Transactional
    public CustomerAddressResponse setDefault(UUID addressId) {
        Account customer = currentAccountService.requireCustomer();
        CustomerAddress customerAddress = customerAddressRepository.findByIdAndAccountId(addressId, customer.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Endereco salvo nao encontrado"));

        if (!customerAddress.isDefaultAddress()) {
            clearCurrentDefault(customer.getId());
            customerAddress.markAsDefault();
            customerAddress = customerAddressRepository.save(customerAddress);
        }

        return CustomerAddressResponse.from(customerAddress);
    }

    @Transactional
    public void delete(UUID addressId) {
        Account customer = currentAccountService.requireCustomer();
        CustomerAddress customerAddress = customerAddressRepository.findByIdAndAccountId(addressId, customer.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Endereco salvo nao encontrado"));

        boolean wasDefault = customerAddress.isDefaultAddress();

        if (wasDefault) {
            customerAddress.clearDefault();
            customerAddressRepository.save(customerAddress);
            customerAddressRepository.flush();
        }

        customerAddressRepository.delete(customerAddress);
        customerAddressRepository.flush();

        if (wasDefault) {
            customerAddressRepository.findFirstByAccountIdAndIdNotOrderByCreatedAtAsc(customer.getId(), addressId)
                .ifPresent((replacementAddress) -> {
                    replacementAddress.markAsDefault();
                    customerAddressRepository.save(replacementAddress);
                });
        }
    }

    private void clearCurrentDefault(UUID accountId) {
        customerAddressRepository.findByAccountIdAndDefaultAddressTrue(accountId).ifPresent((currentDefault) -> {
            currentDefault.clearDefault();
            customerAddressRepository.save(currentDefault);
            customerAddressRepository.flush();
        });
    }

    private Address toAddress(CreateCustomerAddressRequest request) {
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

    private Address toAddress(UpdateCustomerAddressRequest request) {
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