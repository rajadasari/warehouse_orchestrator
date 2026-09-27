package org.platform.resourcemanager.domain.rule;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Regex-based rule predicate for string properties (barcodes, SKU patterns, error codes).
 */
public record RegexRulePredicate(
        Pattern compiledPattern,
        boolean matchExpected
) implements RulePredicate {

    public RegexRulePredicate {
        Objects.requireNonNull(compiledPattern, "compiledPattern must not be null");
    }

    public RegexRulePredicate(String regex, boolean matchExpected) {
        this(Pattern.compile(Objects.requireNonNull(regex, "regex must not be null")), matchExpected);
    }

    public static RegexRulePredicate matches(String regex) {
        return new RegexRulePredicate(regex, true);
    }

    public static RegexRulePredicate notMatches(String regex) {
        return new RegexRulePredicate(regex, false);
    }

    @Override
    public boolean test(Object propertyValue) {
        if (propertyValue == null) {
            return false;
        }
        String stringVal = String.valueOf(propertyValue);
        boolean matches = compiledPattern.matcher(stringVal).matches();
        return matches == matchExpected;
    }
}
