package com.delivery.config;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.delivery.account.domain.AccountProfile;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

public final class LoginProfileSessionSupport {

    public static final String SESSION_ATTRIBUTE = LoginProfileSessionSupport.class.getName() + ".profile";

    private LoginProfileSessionSupport() {
    }

    public static AccountProfile readProfile(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }

        Object profile = session.getAttribute(SESSION_ATTRIBUTE);
        return profile instanceof AccountProfile accountProfile ? accountProfile : null;
    }

    public static void writeProfile(HttpServletRequest request, AccountProfile profile) {
        request.getSession(true).setAttribute(SESSION_ATTRIBUTE, profile);
    }

    public static void clearProfile(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.removeAttribute(SESSION_ATTRIBUTE);
        }
    }

    public static Collection<GrantedAuthority> mergeProfileAuthority(
        Collection<? extends GrantedAuthority> authorities,
        AccountProfile profile
    ) {
        Set<GrantedAuthority> mergedAuthorities = new LinkedHashSet<>();

        for (GrantedAuthority authority : authorities) {
            String value = authority.getAuthority();
            if (!"ROLE_CUSTOMER".equals(value) && !"ROLE_MERCHANT".equals(value)) {
                mergedAuthorities.add(authority);
            }
        }

        if (profile != null) {
            mergedAuthorities.add(new SimpleGrantedAuthority("ROLE_" + profile.name()));
        }

        return mergedAuthorities;
    }
}