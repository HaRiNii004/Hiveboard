package com.h.hiveboard.backend.notification.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// Stores NotificationType as its name in a plain text column. (With @Enumerated, Hibernate adds
// a database CHECK listing today's values, which schema updates never extend, so a new
// notification type would be rejected by existing databases.)
@Converter
public class NotificationTypeConverter implements AttributeConverter<NotificationType, String> {

    @Override
    public String convertToDatabaseColumn(NotificationType type) {
        return type == null ? null : type.name();
    }

    @Override
    public NotificationType convertToEntityAttribute(String value) {
        return value == null ? null : NotificationType.valueOf(value);
    }
}
