package com.delivery.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ROLE_CLAIM = "https://delivery.app/roles";

    private final ProfileAwareAuthorizationRequestResolver profileAwareAuthorizationRequestResolver;
    private final ProfileAwareAuthenticationSuccessHandler profileAwareAuthenticationSuccessHandler;

    public SecurityConfig(
        ProfileAwareAuthorizationRequestResolver profileAwareAuthorizationRequestResolver,
        ProfileAwareAuthenticationSuccessHandler profileAwareAuthenticationSuccessHandler
    ) {
        this.profileAwareAuthorizationRequestResolver = profileAwareAuthorizationRequestResolver;
        this.profileAwareAuthenticationSuccessHandler = profileAwareAuthenticationSuccessHandler;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors((cors) -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests((authorize) -> authorize
                .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/me/establishments").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/establishments", "/api/establishments/*/products", "/api/orders").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2Login((oauth2Login) -> oauth2Login
                .authorizationEndpoint((authorizationEndpoint) ->
                    authorizationEndpoint.authorizationRequestResolver(profileAwareAuthorizationRequestResolver)
                )
                .userInfoEndpoint((userInfo) -> userInfo.userAuthoritiesMapper(userAuthoritiesMapper()))
                .successHandler(profileAwareAuthenticationSuccessHandler)
            )
            .oauth2ResourceServer((resourceServer) -> resourceServer.jwt((jwt) -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    @Bean
    GrantedAuthoritiesMapper userAuthoritiesMapper() {
        return (authorities) -> {
            Set<GrantedAuthority> mappedAuthorities = new LinkedHashSet<>(authorities);

            for (GrantedAuthority authority : authorities) {
                if (authority instanceof OidcUserAuthority oidcUserAuthority) {
                    mappedAuthorities.addAll(extractAuthorities(oidcUserAuthority.getIdToken().getClaims()));

                    if (oidcUserAuthority.getUserInfo() != null) {
                        mappedAuthorities.addAll(extractAuthorities(oidcUserAuthority.getUserInfo().getClaims()));
                    }

                    continue;
                }

                if (authority instanceof OAuth2UserAuthority oauth2UserAuthority) {
                    mappedAuthorities.addAll(extractAuthorities(oauth2UserAuthority.getAttributes()));
                }
            }

            return mappedAuthorities;
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsProperties.getAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Location"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
        return converter;
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.addAll(readScopes(jwt));
        authorities.addAll(extractRoleAuthorities(jwt.getClaim(ROLE_CLAIM)));

        return authorities;
    }

    private Collection<GrantedAuthority> extractAuthorities(Map<String, Object> claims) {
        return extractRoleAuthorities(claims.get(ROLE_CLAIM));
    }

    private Collection<GrantedAuthority> extractRoleAuthorities(Object roleClaim) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        if (roleClaim instanceof Collection<?> roles) {
            for (Object role : roles) {
                if (role != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toString().toUpperCase()));
                }
            }
        }

        return authorities;
    }

    private List<GrantedAuthority> readScopes(Jwt jwt) {
        String scope = jwt.getClaimAsString("scope");
        if (scope == null || scope.isBlank()) {
            return List.of();
        }

        return Stream.of(scope.split("\\s+"))
            .filter(value -> !value.isBlank())
            .<GrantedAuthority>map(value -> new SimpleGrantedAuthority("SCOPE_" + value))
            .toList();
    }
}