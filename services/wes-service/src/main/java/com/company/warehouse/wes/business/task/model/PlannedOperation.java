package com.company.warehouse.wes.business.task.model;

import com.company.warehouse.common.core.enums.TaskOperationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannedOperation {
    private int sequence;
    private TaskOperationType operationType;
    private String handlerType; // 'WMS', 'WCS', 'OPERATOR', 'SYSTEM'
    private String description;
}
