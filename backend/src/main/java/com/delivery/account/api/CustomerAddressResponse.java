package com.delivery.account.api;

import java.util.UUID;

import com.delivery.account.domain.CustomerAddress;
import com.delivery.establishment.domain.Address;

public record CustomerAddressResponse(
    UUID id,
    String label,
    boolean defaultAddress,
    AddressResponse address
) {

    public static CustomerAddressResponse from(CustomerAddress customerAddress) {
        return new CustomerAddressResponse(
            customerAddress.getId(),
            customerAddress.getLabel(),
            customerAddress.isDefaultAddress(),
            AddressResponse.from(customerAddress.getAddress())
        );
    }

    public record AddressResponse(
        String zipCode,
        String street,
        String number,
        String district,
        String city,
        String state,
        String complement
    ) {

        public static AddressResponse from(Address address) {
            return new AddressResponse(
                address.getZipCode(),
                address.getStreet(),
                address.getNumber(),
                address.getDistrict(),
                address.getCity(),
                address.getState(),
                address.getComplement()
            );
        }
    }
}