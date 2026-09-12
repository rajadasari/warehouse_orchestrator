package com.company.warehouse.wes.business.validation.model;

import com.company.warehouse.common.core.enums.ValidationOutcome;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationResult implements Serializable {

    @Builder.Default
    private ValidationOutcome outcome = ValidationOutcome.INFO;

    @Builder.Default
    private List<ValidationMessage> messages = new ArrayList<>();

    public void addInfo(String code, String message, String field) {
        messages.add(ValidationMessage.builder()
                .code(code)
                .message(message)
                .field(field)
                .severity(ValidationOutcome.INFO)
                .build());
        recalculateOutcome();
    }

    public void addWarning(String code, String message, String field) {
        messages.add(ValidationMessage.builder()
                .code(code)
                .message(message)
                .field(field)
                .severity(ValidationOutcome.WARNING)
                .build());
        recalculateOutcome();
    }

    public void addReject(String code, String message, String field) {
        messages.add(ValidationMessage.builder()
                .code(code)
                .message(message)
                .field(field)
                .severity(ValidationOutcome.REJECT)
                .build());
        recalculateOutcome();
    }

    public boolean isRejected() {
        return outcome == ValidationOutcome.REJECT;
    }

    public boolean hasWarnings() {
        return messages.stream().anyMatch(m -> m.getSeverity() == ValidationOutcome.WARNING);
    }

    public boolean hasWarningCode(String code) {
        return messages.stream().anyMatch(m -> m.getSeverity() == ValidationOutcome.WARNING && code.equalsIgnoreCase(m.getCode()));
    }

    public List<ValidationMessage> getErrors() {
        return messages.stream()
                .filter(m -> m.getSeverity() == ValidationOutcome.REJECT)
                .collect(Collectors.toList());
    }

    public List<ValidationMessage> getWarnings() {
        return messages.stream()
                .filter(m -> m.getSeverity() == ValidationOutcome.WARNING)
                .collect(Collectors.toList());
    }

    public List<ValidationMessage> getInfos() {
        return messages.stream()
                .filter(m -> m.getSeverity() == ValidationOutcome.INFO)
                .collect(Collectors.toList());
    }

    private void recalculateOutcome() {
        if (messages.stream().anyMatch(m -> m.getSeverity() == ValidationOutcome.REJECT)) {
            this.outcome = ValidationOutcome.REJECT;
        } else if (messages.stream().anyMatch(m -> m.getSeverity() == ValidationOutcome.WARNING)) {
            this.outcome = ValidationOutcome.WARNING;
        } else {
            this.outcome = ValidationOutcome.INFO;
        }
    }
}
