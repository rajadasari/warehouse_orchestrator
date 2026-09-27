package com.company.warehouse.common.industrial.opcua.model;

import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.Variant;

import java.time.Instant;

/**
 * Standardized data types for industrial OPC UA tag exchanges.
 */
public enum OpcUaDataType {
    BOOLEAN,
    BYTE,
    INT16,
    INT32,
    INT64,
    FLOAT,
    DOUBLE,
    STRING,
    BYTE_STRING,
    DATE_TIME;

    public Object coerceValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        if (rawValue instanceof Variant variant) {
            rawValue = variant.getValue();
            if (rawValue == null) return null;
        }
        if (rawValue instanceof DataValue dataValue) {
            Variant v = dataValue.getValue();
            rawValue = (v != null) ? v.getValue() : null;
            if (rawValue == null) return null;
        }

        String str = rawValue.toString().trim();
        return switch (this) {
            case BOOLEAN -> {
                if (rawValue instanceof Boolean b) yield b;
                if ("1".equals(str) || "true".equalsIgnoreCase(str)) yield Boolean.TRUE;
                yield Boolean.FALSE;
            }
            case BYTE -> (rawValue instanceof Number n) ? n.byteValue() : Byte.parseByte(str);
            case INT16 -> (rawValue instanceof Number n) ? n.shortValue() : Short.parseShort(str);
            case INT32 -> (rawValue instanceof Number n) ? n.intValue() : Integer.parseInt(str);
            case INT64 -> (rawValue instanceof Number n) ? n.longValue() : Long.parseLong(str);
            case FLOAT -> (rawValue instanceof Number n) ? n.floatValue() : Float.parseFloat(str);
            case DOUBLE -> (rawValue instanceof Number n) ? n.doubleValue() : Double.parseDouble(str);
            case STRING -> str;
            case BYTE_STRING -> (rawValue instanceof byte[] b) ? b : str.getBytes();
            case DATE_TIME -> {
                if (rawValue instanceof Instant inst) yield inst;
                yield Instant.parse(str);
            }
        };
    }

    public Variant toVariant(Object rawValue) {
        Object coerced = coerceValue(rawValue);
        return coerced != null ? new Variant(coerced) : Variant.NULL_VALUE;
    }
}
