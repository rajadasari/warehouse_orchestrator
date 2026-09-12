package com.company.warehouse.wes.api.dto;

import com.company.warehouse.common.core.enums.ValidationOutcome;
import com.company.warehouse.wes.business.validation.model.ValidationMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InboundExecutionResponse implements Serializable {
    private ValidationOutcome outcome;
    private String status; // 'ACCEPTED', 'ACCEPTED_WITH_WARNINGS', 'REJECTED'
    private String palletLpn;
    private UUID taskId;
    private String taskNumber;
    @Builder.Default
    private List<ValidationMessage> messages = new ArrayList<>();

    public static InboundExecutionResponse rejected(String lpn, List<ValidationMessage> errors) {
        return InboundExecutionResponse.builder()
                .outcome(ValidationOutcome.REJECT)
                .status("REJECTED")
                .palletLpn(lpn)
                .messages(errors)
                .build();
    }

    public static InboundExecutionResponse accepted(String lpn, UUID taskId, String taskNumber, List<ValidationMessage> infos) {
        return InboundExecutionResponse.builder()
                .outcome(ValidationOutcome.INFO)
                .status("ACCEPTED")
                .palletLpn(lpn)
                .taskId(taskId)
                .taskNumber(taskNumber)
                .messages(infos)
                .build();
    }

    public static InboundExecutionResponse acceptedWithWarnings(String lpn, UUID taskId, String taskNumber, List<ValidationMessage> warnings) {
        return InboundExecutionResponse.builder()
                .outcome(ValidationOutcome.WARNING)
                .status("ACCEPTED_WITH_WARNINGS")
                .palletLpn(lpn)
                .taskId(taskId)
                .taskNumber(taskNumber)
                .messages(warnings)
                .build();
    }

    public List<com.company.warehouse.common.core.validation.FieldValidationError> getFieldErrors() {
        if (messages == null) return List.of();
        return messages.stream()
                .filter(m -> m.getSeverity() == ValidationOutcome.REJECT)
                .map(m -> com.company.warehouse.common.core.validation.FieldValidationError.builder()
                        .field(m.getField())
                        .errorCode(m.getCode())
                        .message(m.getMessage())
                        .build())
                .toList();
    }
}
