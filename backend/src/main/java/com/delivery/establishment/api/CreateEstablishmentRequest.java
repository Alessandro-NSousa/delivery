package com.delivery.establishment.api;

import com.delivery.establishment.domain.EstablishmentCategory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateEstablishmentRequest(
    @NotBlank String tradeName,
    @NotBlank String corporateName,
    @NotBlank @Pattern(regexp = "\\d{14}", message = "CNPJ deve conter 14 digitos") String cnpj,
    @NotBlank String phone,
    @NotBlank @Email String email,
    @NotNull EstablishmentCategory category,
    @NotBlank String openingHours,
    @NotNull @Valid AddressRequest address
) {
}