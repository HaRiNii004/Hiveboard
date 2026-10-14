package com.h.hiveboard.backend.mail.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

// Sends plain-text emails. Without mail settings (spring.mail.host in
// application.properties) there is no mail sender, so the email is written to the
// console instead, the same way invite links are during development.
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${app.mail.from:HiveBoard <no-reply@hiveboard.local>}")
    private String from;

    // False when emails are only written to the console (no spring.mail.host)
    public boolean isConfigured() {
        return mailSender.getIfAvailable() != null;
    }

    // Returns false if the email could not be sent (the caller decides what that means)
    public boolean send(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("Email NOT sent: no mail server configured (see backend/mail.properties.example). "
                    + "It is only logged here:\nTo: {}\nSubject: {}\n\n{}", to, subject, body);
            return true;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            return true;
        } catch (MailException e) {
            log.error("Could not send email \"{}\" to {}", subject, to, e);
            return false;
        }
    }
}
