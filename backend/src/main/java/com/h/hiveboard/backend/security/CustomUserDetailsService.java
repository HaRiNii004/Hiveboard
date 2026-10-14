package com.h.hiveboard.backend.security;

import com.h.hiveboard.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Exact match first (JWT subjects carry the stored email); then ignoring case, so
        // logging in as "Ann@Example.com" works for ann@example.com
        return userRepository.findByEmail(email)
                .or(() -> userRepository.findFirstByEmailIgnoreCase(email))
                .orElseThrow(() -> new UsernameNotFoundException("No user with email: " + email));
    }
}
