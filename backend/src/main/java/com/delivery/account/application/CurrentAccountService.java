package com.delivery.account.application;

import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import com.delivery.account.domain.Account;
import com.delivery.account.domain.AccountProfile;
import com.delivery.account.infrastructure.AccountRepository;

import jakarta.transaction.Transactional;

@Service
public class CurrentAccountService {

    private final AccountRepository accountRepository;

    public CurrentAccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public Account getCurrentAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Usuario autenticado nao encontrado");
        }

        IdentityData identityData = extractIdentityData(authentication);
        AccountProfile profile = resolveProfile(authentication);

        return accountRepository.findByAuthSubject(identityData.subject())
            .map(account -> sync(account, identityData, profile))
            .orElseGet(() -> accountRepository.save(new Account(
                identityData.subject(),
                identityData.email(),
                identityData.displayName(),
                profile
            )));
    }

    @Transactional
    public Account requireMerchant() {
        return requireProfile(AccountProfile.MERCHANT, "Acesso permitido apenas para lojistas");
    }

    @Transactional
    public Account requireCustomer() {
        return requireProfile(AccountProfile.CUSTOMER, "Acesso permitido apenas para clientes");
    }

    private Account sync(Account account, IdentityData identityData, AccountProfile profile) {
        account.syncFromIdentity(identityData.email(), identityData.displayName(), profile);
        return account;
    }

    private IdentityData extractIdentityData(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            Jwt jwt = jwtAuthenticationToken.getToken();
            return new IdentityData(
                requireSubject(jwt.getSubject()),
                firstNonBlank(jwt.getClaimAsString("email"), jwt.getSubject()),
                firstNonBlank(jwt.getClaimAsString("name"), firstNonBlank(jwt.getClaimAsString("email"), jwt.getSubject()))
            );
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2AuthenticatedPrincipal oauth2Principal) {
            String subject = requireSubject(stringClaim(oauth2Principal.getAttribute("sub")));
            String email = firstNonBlank(stringClaim(oauth2Principal.getAttribute("email")), subject);
            String displayName = firstNonBlank(stringClaim(oauth2Principal.getAttribute("name")), email);
            return new IdentityData(subject, email, displayName);
        }

        throw new AccessDeniedException("Identidade autenticada nao suportada");
    }

    private AccountProfile resolveProfile(Authentication authentication) {
        boolean customer = hasAuthority(authentication, "ROLE_CUSTOMER");
        boolean merchant = hasAuthority(authentication, "ROLE_MERCHANT");

        if (customer == merchant) {
            throw new AccessDeniedException("O usuario autenticado deve possuir exatamente um perfil");
        }

        return merchant ? AccountProfile.MERCHANT : AccountProfile.CUSTOMER;
    }

    private Account requireProfile(AccountProfile expectedProfile, String message) {
        Account account = getCurrentAccount();
        if (account.getProfile() != expectedProfile) {
            throw new AccessDeniedException(message);
        }

        return account;
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(authority::equals);
    }

    private String requireSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            throw new AccessDeniedException("Identificador do usuario autenticado nao encontrado");
        }

        return subject;
    }

    private String stringClaim(Object value) {
        return value instanceof String claim ? claim : null;
    }

    private String firstNonBlank(String value, String fallback) {
        if (value != null && !value.isBlank()) {
            return value;
        }

        return Objects.requireNonNull(fallback);
    }

    private record IdentityData(String subject, String email, String displayName) {
    }
}