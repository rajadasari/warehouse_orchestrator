package com.company.warehouse.common.industrial.gateway;

import org.platform.gateway.api.DeviceGateway;
import org.platform.gateway.modbus.ModbusTcpGateway;
import org.platform.gateway.opcua.OpcUaDeviceGateway;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Factory for creating and caching unified DeviceGateway instances for OPC UA and Modbus PLCs.
 */
public class SpringDeviceGatewayFactory implements AutoCloseable {

    private final Map<String, DeviceGateway> gatewayCache = new ConcurrentHashMap<>();

    public DeviceGateway getGateway(String endpointUrl) {
        return gatewayCache.computeIfAbsent(endpointUrl, this::createGateway);
    }

    private DeviceGateway createGateway(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Endpoint URL must not be blank");
        }
        if (url.startsWith("opc.tcp://")) {
            return new OpcUaDeviceGateway(url);
        } else if (url.startsWith("modbus.tcp://")) {
            try {
                URI uri = URI.create(url);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 502;
                int unitId = 1;
                String path = uri.getPath();
                if (path != null && path.length() > 1) {
                    try {
                        unitId = Integer.parseInt(path.substring(1));
                    } catch (NumberFormatException ignored) {}
                }
                return new ModbusTcpGateway(host, port, unitId, 3000);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid Modbus URL: " + url, e);
            }
        }
        throw new IllegalArgumentException("Unsupported industrial protocol scheme in URL: " + url);
    }

    @Override
    public void close() {
        gatewayCache.values().forEach(gateway -> {
            try {
                gateway.close();
            } catch (Exception ignored) {}
        });
        gatewayCache.clear();
    }
}
