package com.company.warehouse.common.industrial.gateway;

import org.junit.jupiter.api.Test;
import org.platform.gateway.api.DeviceGateway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SpringDeviceGatewayFactoryTest {

    @Test
    void testCreateModbusAndOpcUaGateways() {
        try (SpringDeviceGatewayFactory factory = new SpringDeviceGatewayFactory()) {
            DeviceGateway modbusGw = factory.getGateway("modbus.tcp://127.0.0.1:502/1");
            assertNotNull(modbusGw);
            assertEquals("MODBUS_TCP", modbusGw.protocol());

            DeviceGateway opcGw = factory.getGateway("opc.tcp://127.0.0.1:4840");
            assertNotNull(opcGw);
            assertEquals("OPCUA", opcGw.protocol());

            // Cached instance check
            DeviceGateway cached = factory.getGateway("modbus.tcp://127.0.0.1:502/1");
            assertSame(modbusGw, cached);
        }
    }

    @Test
    void testUnsupportedProtocolThrows() {
        try (SpringDeviceGatewayFactory factory = new SpringDeviceGatewayFactory()) {
            Exception ex = assertThrows(IllegalArgumentException.class, () -> factory.getGateway("ftp://127.0.0.1:21"));
            assertTrue(ex.getMessage().contains("Unsupported industrial protocol"));
        }
    }
}
