package com.delivery.account.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.account.infrastructure.AccountRepository;

@ExtendWith(MockitoExtension.class)
class CurrentAccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private CurrentAccountService currentAccountService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCreateAccountFromAuthenticatedJwt() {
        authenticateWith("auth0|merchant-1", List.of("ROLE_MERCHANT"));
        when(accountRepository.findByAuthSubject("auth0|merchant-1")).thenReturn(Optional.empty());
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account account = currentAccountService.getCurrentAccount();

        assertThat(account.getAuthSubject()).isEqualTo("auth0|merchant-1");
        assertThat(account.getEmail()).isEqualTo("merchant@example.com");
        assertThat(account.getDisplayName()).isEqualTo("Merchant Example");
        assertThat(account.getProfile()).isEqualTo(AccountProfile.MERCHANT);
    }

    @Test
    void shouldRejectAuthenticationWithoutExclusiveProfile() {
        authenticateWith("auth0|merchant-1", List.of("ROLE_MERCHANT", "ROLE_CUSTOMER"));

        assertThatThrownBy(() -> currentAccountService.getCurrentAccount())
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("exatamente um perfil");
    }

    private void authenticateWith(String subject, List<String> authorities) {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("sub", subject)
            .claim("email", "merchant@example.com")
            .claim("name", "Merchant Example")
            .build();

        JwtAuthenticationToken authentication = new JwtAuthenticationToken(
            jwt,
            authorities.stream().map(SimpleGrantedAuthority::new).toList()
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}