package com.delivery.establishment.api;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.domain.EstablishmentCategory;

public record EstablishmentResponse(
    UUID id,
    String tradeName,
    String corporateName,
    String cnpj,
    String phone,
    String email,
    EstablishmentCategory category,
    String openingHours,
    AddressResponse address,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

    public static EstablishmentResponse from(Establishment establishment) {
        return new EstablishmentResponse(
            establishment.getId(),
            establishment.getTradeName(),
            establishment.getCorporateName(),
            establishment.getCnpj(),
            establishment.getPhone(),
            establishment.getEmail(),
            establishment.getCategory(),
            establishment.getOpeningHours(),
            AddressResponse.from(establishment.getAddress()),
            establishment.getCreatedAt(),
            establishment.getUpdatedAt()
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