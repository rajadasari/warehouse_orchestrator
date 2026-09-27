package com.company.warehouse.common.resource;

import com.company.warehouse.common.resource.config.ResourceEngineAutoConfiguration;
import org.junit.jupiter.api.Test;
import org.platform.resourcemanager.api.ResourceClient;
import org.platform.resourcemanager.api.dto.CreateResourceRequest;
import org.platform.resourcemanager.api.dto.ResourceResponse;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ResourceEngineAutoConfigurationTest {

    @Test
    void testResourceClientCreationAndRegistration() {
        ResourceEngineAutoConfiguration config = new ResourceEngineAutoConfiguration();
        ResourceClient client = config.resourceClient();

        assertNotNull(client);

        CreateResourceRequest req = new CreateResourceRequest(
                "tenant-1",
                "CRANE-01",
                "High Bay Crane",
                "ASRS_CRANE",
                "PHYSICAL",
                "/Plant/Area1/Aisle1",
                10.0, 20.0, 5.0,
                Set.of("LIFT", "STORE"),
                Map.of("maxSpeed", 4.5)
        );

        ResourceResponse res = client.register(req);
        assertNotNull(res);
        assertEquals("CRANE-01", res.resourceId());
        assertEquals("READY", res.state());
    }
}
