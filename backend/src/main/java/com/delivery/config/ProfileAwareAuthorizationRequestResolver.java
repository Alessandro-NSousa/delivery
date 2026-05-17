package com.delivery.config;

import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

import com.delivery.account.domain.AccountProfile;

import jakarta.servlet.http.HttpServletRequest;

@Component
public class ProfileAwareAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final OAuth2AuthorizationRequestResolver delegate;

    public ProfileAwareAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
            clientRegistrationRepository,
            "/oauth2/authorization"
        );
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return captureProfile(request, delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return captureProfile(request, delegate.resolve(request, clientRegistrationId));
    }

    private OAuth2AuthorizationRequest captureProfile(HttpServletRequest request, OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null) {
            return null;
        }

        AccountProfile profile = parseProfile(request.getParameter("profile"));
        if (profile != null) {
            LoginProfileSessionSupport.writeProfile(request, profile);
        } else {
            LoginProfileSessionSupport.clearProfile(request);
        }

        return authorizationRequest;
    }

    private AccountProfile parseProfile(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return AccountProfile.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}