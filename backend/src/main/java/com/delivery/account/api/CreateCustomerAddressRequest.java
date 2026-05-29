package com.delivery.account.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCustomerAddressRequest(
    String label,
    @NotBlank @Pattern(regexp = "\\d{8}", message = "CEP deve conter 8 digitos") String zipCode,
    @NotBlank String street,
    @NotBlank String number,
    @NotBlank String district,
    @NotBlank String city,
    @NotBlank @Size(min = 2, max = 2, message = "UF deve ter 2 caracteres") String state,
    String complement,
    boolean defaultAddress
) {
}