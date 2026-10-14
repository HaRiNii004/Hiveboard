package com.h.hiveboard.backend.activity.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// Stores ActivityType as its name in a plain text column. (With @Enumerated, Hibernate adds
// a database CHECK listing today's values, and schema updates never extend it, so every new
// activity type would be rejected by existing databases.)
@Converter
public class ActivityTypeConverter implements AttributeConverter<ActivityType, String> {

    @Override
    public String convertToDatabaseColumn(ActivityType type) {
        return type == null ? null : type.name();
    }

    @Override
    public ActivityType convertToEntityAttribute(String value) {
        return value == null ? null : ActivityType.valueOf(value);
    }
}
