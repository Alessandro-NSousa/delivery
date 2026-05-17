package com.delivery.config;

import java.io.IOException;
import java.util.Collection;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import com.delivery.account.domain.AccountProfile;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class ProfileAwareAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final SavedRequestAwareAuthenticationSuccessHandler delegate = new SavedRequestAwareAuthenticationSuccessHandler();
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
        throws IOException, ServletException {
        AccountProfile profile = LoginProfileSessionSupport.readProfile(request);
        Authentication normalizedAuthentication = normalizeAuthentication(authentication, profile);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(normalizedAuthentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        delegate.onAuthenticationSuccess(request, response, normalizedAuthentication);
    }

    private Authentication normalizeAuthentication(Authentication authentication, AccountProfile profile) {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth2AuthenticationToken)) {
            return authentication;
        }

        OAuth2User principal = oauth2AuthenticationToken.getPrincipal();
        Collection authorities = LoginProfileSessionSupport.mergeProfileAuthority(oauth2AuthenticationToken.getAuthorities(), profile);

        OAuth2AuthenticationToken normalizedToken = new OAuth2AuthenticationToken(
            principal,
            authorities,
            oauth2AuthenticationToken.getAuthorizedClientRegistrationId()
        );
        normalizedToken.setDetails(oauth2AuthenticationToken.getDetails());
        return normalizedToken;
    }
}