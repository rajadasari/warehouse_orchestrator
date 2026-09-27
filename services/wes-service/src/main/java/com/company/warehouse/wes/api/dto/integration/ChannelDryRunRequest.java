package com.company.warehouse.wes.api.dto.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Request payload for testing an integration channel configuration before persisting it.
 * Enables AI agents to dry-run and verify mappings/rules.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelDryRunRequest implements Serializable {

    private IntegrationChannelDto channelConfig;
    private String samplePayload;
}
