package com.company.warehouse.wes.api.dto.workflow;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriggerWorkflowRequest implements Serializable {

    @NotBlank(message = "Workflow code is required")
    private String workflowCode;

    private String entityReference; // e.g. pallet LPN

    private Map<String, Object> initialContext;
}
