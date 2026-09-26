package com.eventvault.config;

import com.eventvault.entity.Event;
import com.eventvault.entity.Role;
import com.eventvault.entity.User;
import com.eventvault.repository.EventRepository;
import com.eventvault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Dev-profile-only convenience data so you can hit the API immediately
 * without manually creating an admin and an event first. Never runs against
 * the default (Postgres) profile.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.save(User.builder()
                    .name("Admin")
                    .email("admin@eventvault.dev")
                    .password(passwordEncoder.encode("admin1234"))
                    .role(Role.ADMIN)
                    .build());
        }

        if (eventRepository.count() == 0) {
            eventRepository.save(Event.builder()
                    .name("Spring Boot Conf 2026")
                    .description("A conference about Spring Boot.")
                    .venue("Main Auditorium")
                    .startTime(LocalDateTime.now().plusDays(30))
                    .totalSeats(3)
                    .availableSeats(3)
                    .build());
        }
    }
}
