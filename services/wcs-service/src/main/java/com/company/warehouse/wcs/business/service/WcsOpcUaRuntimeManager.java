package com.company.warehouse.wcs.business.service;

import com.company.warehouse.common.industrial.opcua.OpcUaOperations;
import com.company.warehouse.common.industrial.opcua.client.MiloOpcUaClientEngine;
import com.company.warehouse.common.industrial.opcua.client.OpcUaClientEngine;
import com.company.warehouse.common.industrial.opcua.model.*;
import com.company.warehouse.common.industrial.opcua.server.OpcUaServerEngine;
import com.company.warehouse.common.industrial.opcua.server.VirtualOpcUaServerEngine;
import com.company.warehouse.wcs.data.entity.*;
import com.company.warehouse.wcs.data.repository.*;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lifecycle manager for active industrial OPC UA Client connections and Server instances in WCS.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WcsOpcUaRuntimeManager {

    private final OpcUaClientConfigRepository clientConfigRepository;
    private final OpcUaServerConfigRepository serverConfigRepository;
    private final OpcUaTagMappingRepository tagMappingRepository;
    private final OpcUaTagGroupRepository tagGroupRepository;

    private final Map<String, OpcUaClientEngine> activeClients = new ConcurrentHashMap<>();
    private final Map<String, OpcUaServerEngine> activeServers = new ConcurrentHashMap<>();

    @PostConstruct
    public void initialize() {
        log.info("Initializing WCS OPC UA Runtime Manager...");
        // Auto-start active servers
        List<OpcUaServerConfigEntity> servers = serverConfigRepository.findAll();
        for (OpcUaServerConfigEntity s : servers) {
            if (s.isActive() && s.isAutoStart()) {
                startServer(s);
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down active WCS OPC UA instances...");
        activeClients.values().forEach(client -> {
            try {
                client.disconnect();
            } catch (Exception ignored) {}
        });
        activeServers.values().forEach(server -> {
            try {
                server.stop();
            } catch (Exception ignored) {}
        });
        activeClients.clear();
        activeServers.clear();
    }

    public synchronized OpcUaServerEngine startServer(OpcUaServerConfigEntity entity) {
        if (activeServers.containsKey(entity.getServerCode())) {
            return activeServers.get(entity.getServerCode());
        }

        OpcUaServerEngine server = new VirtualOpcUaServerEngine();
        server.start(OpcUaServerConfig.builder()
                .serverCode(entity.getServerCode())
                .bindPort(entity.getBindPort())
                .endpointPath(entity.getEndpointPath())
                .namespaceUri(entity.getNamespaceUri())
                .build());

        // Load associated tags
        List<OpcUaTagMappingEntity> tags = tagMappingRepository.findByServerCode(entity.getServerCode());
        for (OpcUaTagMappingEntity tag : tags) {
            OpcUaDataType dt = parseDataType(tag.getDataType());
            server.registerNode(OpcUaTagDefinition.builder()
                    .tagKey(tag.getTagKey())
                    .nodeIdStr(tag.getNodeId())
                    .dataType(dt)
                    .accessLevel(tag.getAccessLevel())
                    .samplingIntervalMs(tag.getSamplingIntervalMs())
                    .deadband(tag.getDeadband())
                    .equipmentCode(tag.getEquipmentCode())
                    .description(tag.getDescription())
                    .build(), null);
        }

        // Load groups
        List<OpcUaTagGroupEntity> groups = tagGroupRepository.findAll();
        for (OpcUaTagGroupEntity g : groups) {
            List<String> memberKeys = g.getItems().stream().map(OpcUaTagGroupItemEntity::getTagKey).toList();
            server.registerTagGroup(OpcUaTagGroupDefinition.builder()
                    .groupKey(g.getGroupKey())
                    .description(g.getDescription())
                    .equipmentCode(g.getEquipmentCode())
                    .tagKeys(memberKeys)
                    .build());
        }

        activeServers.put(entity.getServerCode(), server);
        log.info("Started WCS OPC UA Server instance: {}", entity.getServerCode());
        return server;
    }

    public synchronized OpcUaClientEngine getOrCreateClient(String clientCode) {
        if (activeClients.containsKey(clientCode)) {
            return activeClients.get(clientCode);
        }

        Optional<OpcUaClientConfigEntity> configOpt = clientConfigRepository.findByClientCode(clientCode);
        if (configOpt.isEmpty()) {
            throw new IllegalArgumentException("Unknown OPC UA Client code: " + clientCode);
        }

        OpcUaClientConfigEntity entity = configOpt.get();
        OpcUaClientEngine client = new MiloOpcUaClientEngine();

        OpcUaSecurityPolicy policy = OpcUaSecurityPolicy.NONE;
        try {
            policy = OpcUaSecurityPolicy.valueOf(entity.getSecurityPolicy().toUpperCase());
        } catch (Exception ignored) {}

        OpcUaAuthType auth = OpcUaAuthType.ANONYMOUS;
        try {
            auth = OpcUaAuthType.valueOf(entity.getAuthType().toUpperCase());
        } catch (Exception ignored) {}

        client.connect(OpcUaClientConfig.builder()
                .clientCode(entity.getClientCode())
                .endpointUrl(entity.getEndpointUrl())
                .securityPolicy(policy)
                .authType(auth)
                .username(entity.getUsername())
                .password(entity.getPasswordEncrypted())
                .keystorePath(entity.getKeystorePath())
                .certificateAlias(entity.getCertificateAlias())
                .requestTimeoutMs(entity.getRequestTimeoutMs())
                .sessionTimeoutMs(entity.getSessionTimeoutMs())
                .reconnectIntervalMs(entity.getReconnectIntervalMs())
                .build());

        // Register associated tags
        List<OpcUaTagMappingEntity> tags = tagMappingRepository.findByClientCode(clientCode);
        for (OpcUaTagMappingEntity tag : tags) {
            OpcUaDataType dt = parseDataType(tag.getDataType());
            client.registerTag(OpcUaTagDefinition.builder()
                    .tagKey(tag.getTagKey())
                    .nodeIdStr(tag.getNodeId())
                    .dataType(dt)
                    .accessLevel(tag.getAccessLevel())
                    .samplingIntervalMs(tag.getSamplingIntervalMs())
                    .deadband(tag.getDeadband())
                    .equipmentCode(tag.getEquipmentCode())
                    .description(tag.getDescription())
                    .build());
        }

        activeClients.put(clientCode, client);
        return client;
    }

    public OpcUaOperations getIo(String code) {
        if (activeClients.containsKey(code)) {
            return activeClients.get(code);
        }
        if (activeServers.containsKey(code)) {
            return activeServers.get(code);
        }

        // Check if it's a known client in DB
        if (clientConfigRepository.existsByClientCode(code)) {
            return getOrCreateClient(code);
        }

        // Check if it's a known server in DB
        Optional<OpcUaServerConfigEntity> srvOpt = serverConfigRepository.findByServerCode(code);
        if (srvOpt.isPresent()) {
            return startServer(srvOpt.get());
        }

        // Default fallback to first active server
        if (!activeServers.isEmpty()) {
            return activeServers.values().iterator().next();
        }

        throw new IllegalArgumentException("No active OPC UA Client or Server found for code: " + code);
    }

    public Optional<OpcUaServerEngine> getServer(String serverCode) {
        return Optional.ofNullable(activeServers.get(serverCode));
    }

    public Optional<OpcUaClientEngine> getClient(String clientCode) {
        return Optional.ofNullable(activeClients.get(clientCode));
    }

    private OpcUaDataType parseDataType(String str) {
        if (str == null) return OpcUaDataType.STRING;
        try {
            return OpcUaDataType.valueOf(str.trim().toUpperCase());
        } catch (Exception e) {
            return OpcUaDataType.STRING;
        }
    }
}
