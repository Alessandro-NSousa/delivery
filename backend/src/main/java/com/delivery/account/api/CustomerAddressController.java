package com.delivery.account.api;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.delivery.account.application.CustomerAddressService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/me/addresses")
public class CustomerAddressController {

    private final CustomerAddressService customerAddressService;

    public CustomerAddressController(CustomerAddressService customerAddressService) {
        this.customerAddressService = customerAddressService;
    }

    @GetMapping
    public List<CustomerAddressResponse> listMine() {
        return customerAddressService.listMine();
    }

    @PostMapping
    public ResponseEntity<CustomerAddressResponse> create(@Valid @RequestBody CreateCustomerAddressRequest request) {
        CustomerAddressResponse response = customerAddressService.create(request);
        return ResponseEntity.created(URI.create("/api/me/addresses/" + response.id())).body(response);
    }

    @PutMapping("/{addressId}")
    public CustomerAddressResponse update(
        @PathVariable UUID addressId,
        @Valid @RequestBody UpdateCustomerAddressRequest request
    ) {
        return customerAddressService.update(addressId, request);
    }

    @PatchMapping("/{addressId}/default")
    public CustomerAddressResponse setDefault(@PathVariable UUID addressId) {
        return customerAddressService.setDefault(addressId);
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> delete(@PathVariable UUID addressId) {
        customerAddressService.delete(addressId);
        return ResponseEntity.noContent().build();
    }
}