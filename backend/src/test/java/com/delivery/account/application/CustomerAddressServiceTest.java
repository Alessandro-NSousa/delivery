package com.delivery.account.application;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.delivery.account.api.CreateCustomerAddressRequest;
import com.delivery.account.api.CustomerAddressResponse;
import com.delivery.account.api.UpdateCustomerAddressRequest;
import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.account.domain.CustomerAddress;
import com.delivery.account.infrastructure.CustomerAddressRepository;
import com.delivery.establishment.domain.Address;
import com.delivery.shared.domain.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class CustomerAddressServiceTest {

    @Mock
    private CustomerAddressRepository customerAddressRepository;

    @Mock
    private CurrentAccountService currentAccountService;

    @InjectMocks
    private CustomerAddressService customerAddressService;

    @Test
    void shouldCreateFirstAddressAsDefaultEvenWhenRequestDoesNotFlagIt() {
        Account customer = sampleCustomer();
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.existsByAccountId(customer.getId())).thenReturn(false);
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        CustomerAddressResponse response = customerAddressService.create(createRequest(false));

        assertThat(response.defaultAddress()).isTrue();
        assertThat(response.address().state()).isEqualTo("SP");
        assertThat(response.address().complement()).isEqualTo("Apto 91");
    }

    @Test
    void shouldCreateNewAddressWithoutChangingDefaultWhenRequestDoesNotAskForIt() {
        Account customer = sampleCustomer();
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.existsByAccountId(customer.getId())).thenReturn(true);
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        CustomerAddressResponse response = customerAddressService.create(createRequest(false));

        assertThat(response.defaultAddress()).isFalse();
    }

    @Test
    void shouldReplaceCurrentDefaultWhenCreatingAddressMarkedAsDefault() {
        Account customer = sampleCustomer();
        CustomerAddress currentDefault = sampleCustomerAddress(customer, "Casa", true);
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.existsByAccountId(customer.getId())).thenReturn(true);
        when(customerAddressRepository.findByAccountIdAndDefaultAddressTrue(customer.getId())).thenReturn(Optional.of(currentDefault));
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        CustomerAddressResponse response = customerAddressService.create(createRequest(true));

        assertThat(currentDefault.isDefaultAddress()).isFalse();
        assertThat(response.defaultAddress()).isTrue();
        verify(customerAddressRepository).flush();
    }

    @Test
    void shouldSetExistingAddressAsDefault() {
        Account customer = sampleCustomer();
        CustomerAddress currentDefault = sampleCustomerAddress(customer, "Casa", true);
        CustomerAddress targetAddress = sampleCustomerAddress(customer, "Trabalho", false);
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.findByIdAndAccountId(targetAddress.getId(), customer.getId()))
            .thenReturn(Optional.of(targetAddress));
        when(customerAddressRepository.findByAccountIdAndDefaultAddressTrue(customer.getId())).thenReturn(Optional.of(currentDefault));
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        CustomerAddressResponse response = customerAddressService.setDefault(targetAddress.getId());

        assertThat(currentDefault.isDefaultAddress()).isFalse();
        assertThat(targetAddress.isDefaultAddress()).isTrue();
        assertThat(response.defaultAddress()).isTrue();
        verify(customerAddressRepository).flush();
    }

    @Test
    void shouldUpdateExistingAddressWithoutChangingDefaultFlag() {
        Account customer = sampleCustomer();
        CustomerAddress currentAddress = sampleCustomerAddress(customer, "Casa", true);
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.findByIdAndAccountId(currentAddress.getId(), customer.getId()))
            .thenReturn(Optional.of(currentAddress));
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        CustomerAddressResponse response = customerAddressService.update(currentAddress.getId(), updateRequest());

        assertThat(response.defaultAddress()).isTrue();
        assertThat(response.label()).isEqualTo("Apto centro");
        assertThat(response.address().zipCode()).isEqualTo("22222000");
        assertThat(response.address().state()).isEqualTo("RJ");
    }

    @Test
    void shouldDeleteDefaultAddressAndPromoteOldestRemainingAddress() {
        Account customer = sampleCustomer();
        CustomerAddress currentDefault = sampleCustomerAddress(customer, "Casa", true);
        CustomerAddress replacementAddress = sampleCustomerAddress(customer, "Trabalho", false);
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.findByIdAndAccountId(currentDefault.getId(), customer.getId()))
            .thenReturn(Optional.of(currentDefault));
        when(customerAddressRepository.findFirstByAccountIdAndIdNotOrderByCreatedAtAsc(customer.getId(), currentDefault.getId()))
            .thenReturn(Optional.of(replacementAddress));
        when(customerAddressRepository.save(org.mockito.ArgumentMatchers.any(CustomerAddress.class)))
            .thenAnswer((invocation) -> invocation.getArgument(0));

        customerAddressService.delete(currentDefault.getId());

        assertThat(currentDefault.isDefaultAddress()).isFalse();
        assertThat(replacementAddress.isDefaultAddress()).isTrue();
        verify(customerAddressRepository).delete(currentDefault);
        verify(customerAddressRepository, org.mockito.Mockito.times(2)).flush();
    }

    @Test
    void shouldRejectSettingDefaultForAddressOutsideCustomerScope() {
        Account customer = sampleCustomer();
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.findByIdAndAccountId(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq(customer.getId())))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerAddressService.setDefault(java.util.UUID.randomUUID()))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Endereco salvo");
    }

    @Test
    void shouldListAddressesForAuthenticatedCustomer() {
        Account customer = sampleCustomer();
        when(currentAccountService.requireCustomer()).thenReturn(customer);
        when(customerAddressRepository.findAllByAccountIdOrderByCreatedAtAsc(customer.getId()))
            .thenReturn(List.of(
                sampleCustomerAddress(customer, "Casa", true),
                sampleCustomerAddress(customer, null, false)
            ));

        List<CustomerAddressResponse> response = customerAddressService.listMine();

        assertThat(response).hasSize(2);
        assertThat(response.get(0).label()).isEqualTo("Casa");
        assertThat(response.get(1).label()).isNull();
    }

    @Test
    void shouldPropagateAccessDeniedWhenSessionIsNotCustomer() {
        when(currentAccountService.requireCustomer()).thenThrow(new AccessDeniedException("Acesso permitido apenas para clientes"));

        assertThatThrownBy(() -> customerAddressService.listMine())
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("clientes");
    }

    private CreateCustomerAddressRequest createRequest(boolean defaultAddress) {
        return new CreateCustomerAddressRequest(
            "Casa",
            "01310930",
            "Avenida Paulista",
            "1500",
            "Bela Vista",
            "Sao Paulo",
            "sp",
            "Apto 91",
            defaultAddress
        );
    }

    private UpdateCustomerAddressRequest updateRequest() {
        return new UpdateCustomerAddressRequest(
            "Apto centro",
            "22222000",
            "Rua das Flores",
            "200",
            "Centro",
            "Rio de Janeiro",
            "rj",
            null
        );
    }

    private CustomerAddress sampleCustomerAddress(Account customer, String label, boolean defaultAddress) {
        return new CustomerAddress(
            customer,
            label,
            defaultAddress,
            new Address("01310930", "Avenida Paulista", "1500", "Bela Vista", "Sao Paulo", "SP", "Apto 91")
        );
    }

    private Account sampleCustomer() {
        return new Account("auth0|customer-1", "customer@example.com", "Customer Example", AccountProfile.CUSTOMER);
    }
}