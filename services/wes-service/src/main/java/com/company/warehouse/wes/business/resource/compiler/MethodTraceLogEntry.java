package com.company.warehouse.wes.business.resource.compiler;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * High-resolution diagnostic trace log entry captured during method execution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodTraceLogEntry implements Serializable {
    private String timestamp; // e.g. "+0.02ms"
    private String phase;     // "INGEST", "COMPUTE", "MUTATE", "EVENT"
    private String message;   // Trace details
    private String level;     // "INFO", "SUCCESS", "WARN", "ERROR"

    public static MethodTraceLogEntry info(String phase, String message) {
        return MethodTraceLogEntry.builder()
                .timestamp("+" + System.nanoTime() % 1000 + "µs")
                .phase(phase)
                .message(message)
                .level("INFO")
                .build();
    }

    public static MethodTraceLogEntry warn(String phase, String message) {
        return MethodTraceLogEntry.builder()
                .timestamp("+" + System.nanoTime() % 1000 + "µs")
                .phase(phase)
                .message(message)
                .level("WARN")
                .build();
    }

    public static MethodTraceLogEntry error(String phase, String message) {
        return MethodTraceLogEntry.builder()
                .timestamp("+" + System.nanoTime() % 1000 + "µs")
                .phase(phase)
                .message(message)
                .level("ERROR")
                .build();
    }
}
