package com.company.warehouse.common.industrial.opcua.funcsupport;

import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Comparison operators for conditional tag evaluation in Functional Support rules.
 * Supports numeric, boolean, and string comparisons with automatic type coercion.
 */
public enum ComparisonOperator {

    // --- Numeric / Universal ---
    EQUALS,
    NOT_EQUALS,
    GREATER_THAN,
    GREATER_THAN_OR_EQUAL,
    LESS_THAN,
    LESS_THAN_OR_EQUAL,

    // --- String-specific ---
    CONTAINS,
    STARTS_WITH,
    ENDS_WITH,
    REGEX_MATCH;

    /**
     * Evaluates this operator against left (actual tag value) and right (threshold/expected).
     * Returns true if the condition passes.
     */
    public boolean evaluate(Object left, Object right) {
        if (left == null && right == null) {
            return this == EQUALS;
        }
        if (left == null || right == null) {
            return this == NOT_EQUALS;
        }

        // Boolean fast-path
        if (left instanceof Boolean leftBool || right instanceof Boolean) {
            boolean lb = toBoolean(left);
            boolean rb = toBoolean(right);
            return switch (this) {
                case EQUALS -> lb == rb;
                case NOT_EQUALS -> lb != rb;
                default -> false;
            };
        }

        // Numeric comparison if both sides resolve to numbers
        Double leftNum = toDouble(left);
        Double rightNum = toDouble(right);
        if (leftNum != null && rightNum != null) {
            int cmp = Double.compare(leftNum, rightNum);
            return switch (this) {
                case EQUALS -> cmp == 0;
                case NOT_EQUALS -> cmp != 0;
                case GREATER_THAN -> cmp > 0;
                case GREATER_THAN_OR_EQUAL -> cmp >= 0;
                case LESS_THAN -> cmp < 0;
                case LESS_THAN_OR_EQUAL -> cmp <= 0;
                default -> false;
            };
        }

        // String comparison fallback
        String leftStr = String.valueOf(left);
        String rightStr = String.valueOf(right);
        return evaluateString(leftStr, rightStr);
    }

    private boolean evaluateString(String left, String right) {
        return switch (this) {
            case EQUALS -> left.equals(right);
            case NOT_EQUALS -> !left.equals(right);
            case GREATER_THAN -> left.compareTo(right) > 0;
            case GREATER_THAN_OR_EQUAL -> left.compareTo(right) >= 0;
            case LESS_THAN -> left.compareTo(right) < 0;
            case LESS_THAN_OR_EQUAL -> left.compareTo(right) <= 0;
            case CONTAINS -> left.contains(right);
            case STARTS_WITH -> left.startsWith(right);
            case ENDS_WITH -> left.endsWith(right);
            case REGEX_MATCH -> regexMatch(left, right);
        };
    }

    private static boolean regexMatch(String input, String regex) {
        try {
            return Pattern.matches(regex, input);
        } catch (PatternSyntaxException e) {
            return false;
        }
    }

    private static Double toDouble(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        if (value instanceof String s) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static boolean toBoolean(Object value) {
        if (value instanceof Boolean b) return b;
        String s = String.valueOf(value).trim().toLowerCase();
        return "true".equals(s) || "1".equals(s);
    }
}
