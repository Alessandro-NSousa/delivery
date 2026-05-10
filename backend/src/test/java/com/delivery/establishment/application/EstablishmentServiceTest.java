package com.delivery.establishment.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.establishment.api.AddressRequest;
import com.delivery.establishment.api.CreateEstablishmentRequest;
import com.delivery.establishment.domain.EstablishmentCategory;
import com.delivery.establishment.infrastructure.EstablishmentRepository;
import com.delivery.shared.domain.BusinessException;

@ExtendWith(MockitoExtension.class)
class EstablishmentServiceTest {

    @Mock
    private EstablishmentRepository establishmentRepository;

    @Mock
    private CurrentAccountService currentAccountService;

    @InjectMocks
    private EstablishmentService establishmentService;

    @Test
    void shouldRejectDuplicatedCnpj() {
        CreateEstablishmentRequest request = sampleRequest();
        when(currentAccountService.requireMerchant()).thenReturn(sampleMerchant());
        when(establishmentRepository.existsByCnpj(request.cnpj())).thenReturn(true);

        assertThatThrownBy(() -> establishmentService.create(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("CNPJ");
    }

    @Test
    void shouldRejectCreationWhenCurrentUserIsNotMerchant() {
        when(currentAccountService.requireMerchant())
            .thenThrow(new AccessDeniedException("Acesso permitido apenas para lojistas"));

        assertThatThrownBy(() -> establishmentService.create(sampleRequest()))
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("lojistas");
    }

    @Test
    void shouldPersistNewEstablishment() {
        CreateEstablishmentRequest request = sampleRequest();
        when(currentAccountService.requireMerchant()).thenReturn(sampleMerchant());
        when(establishmentRepository.existsByCnpj(request.cnpj())).thenReturn(false);
        when(establishmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        establishmentService.create(request);

        verify(establishmentRepository).save(any());
    }

    private CreateEstablishmentRequest sampleRequest() {
        return new CreateEstablishmentRequest(
            "Lanche Bom",
            "Lanche Bom LTDA",
            "12345678000190",
            "11999999999",
            "contato@lanchebom.com",
            EstablishmentCategory.SNACK_BAR,
            "Seg-Dom 18:00-23:30",
            new AddressRequest("01001000", "Rua A", "10", "Centro", "Sao Paulo", "SP", "Loja 1")
        );
    }

    private Account sampleMerchant() {
        return new Account("auth0|merchant-1", "merchant@example.com", "Merchant Example", AccountProfile.MERCHANT);
    }
}