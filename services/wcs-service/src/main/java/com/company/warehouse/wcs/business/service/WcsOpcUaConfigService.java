package com.company.warehouse.wcs.business.service;

import com.company.warehouse.common.industrial.opcua.handshake.HandshakeStepType;
import com.company.warehouse.common.industrial.opcua.model.OpcUaAuthType;
import com.company.warehouse.common.industrial.opcua.model.OpcUaDataType;
import com.company.warehouse.common.industrial.opcua.model.OpcUaSecurityPolicy;
import com.company.warehouse.wcs.api.dto.*;
import com.company.warehouse.wcs.data.entity.*;
import com.company.warehouse.wcs.data.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WcsOpcUaConfigService {

    private final OpcUaClientConfigRepository clientRepository;
    private final OpcUaServerConfigRepository serverRepository;
    private final OpcUaTagMappingRepository tagRepository;
    private final OpcUaTagGroupRepository groupRepository;

    // =========================================================================
    // 1. AI SCHEMA INTROSPECTION & VALIDATION
    // =========================================================================

    public OpcUaAiSchemaDto getAiSchema() {
        return OpcUaAiSchemaDto.builder()
                .version("1.0.0-WCS-OPCUA")
                .description("Self-describing AI schema for configuring industrial OPC UA Clients, Servers, Tag Groups, and Conveyor Station Sequence Nodes.")
                .supportedDataTypes(Arrays.stream(OpcUaDataType.values()).map(Enum::name).toList())
                .supportedSecurityPolicies(Arrays.stream(OpcUaSecurityPolicy.values()).map(Enum::name).toList())
                .supportedAuthTypes(Arrays.stream(OpcUaAuthType.values()).map(Enum::name).toList())
                .handshakeStepTypes(Arrays.stream(HandshakeStepType.values()).map(Enum::name).toList())
                .nodeIdFormatExamples(Map.of(
                        "stringIdentifier", "ns=2;s=Line1.LoadingStation01.Barcode",
                        "numericIdentifier", "ns=1;i=1001",
                        "guidIdentifier", "ns=2;g=12345678-1234-1234-1234-123456789abc"
                ))
                .sampleClientConfig(Map.of(
                        "clientCode", "PLC_LINE_01",
                        "endpointUrl", "opc.tcp://192.168.1.50:4840",
                        "securityPolicy", "BASIC256_SHA256",
                        "authType", "USERNAME_PASSWORD",
                        "username", "wcs_operator"
                ))
                .sampleServerConfig(Map.of(
                        "serverCode", "WCS_EDGE_SERVER",
                        "bindPort", 4840,
                        "endpointPath", "/wcs/opcua",
                        "namespaceUri", "urn:company:warehouse:wcs"
                ))
                .sampleTagGroup(Map.of(
                        "groupKey", "INBOUND_SCAN_GROUP",
                        "description", "Tags read on pallet barcode scan",
                        "tagKeys", List.of("PalletBarcode", "WeightKg", "HeightMm")
                ))
                .sampleStationTemplate(Map.of(
                        "templateCode", "LOADING_STATION_TEMPLATE",
                        "name", "Conveyor Loading Station Sequence",
                        "relativeTags", List.of(
                                Map.of("tagKey", "PalletPresent", "dataType", "BOOLEAN", "accessLevel", "READ"),
                                Map.of("tagKey", "Barcode", "dataType", "STRING", "accessLevel", "READ"),
                                Map.of("tagKey", "TargetLane", "dataType", "INT32", "accessLevel", "WRITE")
                        )
                ))
                .sampleWorkflowNode(Map.of(
                        "id", "node-loading-stn-01",
                        "type", "OPCUA_STATION_ACTION",
                        "label", "Loading Station 01",
                        "config", Map.of(
                                "templateCode", "LOADING_STATION_TEMPLATE",
                                "stationCode", "CONV_STN_01",
                                "tagPrefix", "ns=2;s=Line1.LoadingStation01.",
                                "clientCode", "PLC_LINE_01"
                        )
                ))
                .build();
    }

    public OpcUaValidateResponse validateConfig(OpcUaValidateRequest request) {
        if (request == null || request.targetType() == null || request.payload() == null) {
            return OpcUaValidateResponse.failure(List.of("Request, targetType, and payload are required."));
        }

        List<String> errors = new ArrayList<>();
        Map<String, Object> p = request.payload();

        switch (request.targetType().toUpperCase()) {
            case "CLIENT" -> {
                if (!p.containsKey("clientCode") || String.valueOf(p.get("clientCode")).isBlank()) {
                    errors.add("clientCode is required.");
                }
                if (!p.containsKey("endpointUrl") || String.valueOf(p.get("endpointUrl")).isBlank()) {
                    errors.add("endpointUrl is required (e.g. opc.tcp://host:port).");
                }
            }
            case "SERVER" -> {
                if (!p.containsKey("serverCode") || String.valueOf(p.get("serverCode")).isBlank()) {
                    errors.add("serverCode is required.");
                }
                if (p.containsKey("bindPort")) {
                    try {
                        int port = Integer.parseInt(String.valueOf(p.get("bindPort")));
                        if (port < 1024 || port > 65535) errors.add("bindPort must be between 1024 and 65535.");
                    } catch (Exception e) {
                        errors.add("bindPort must be a valid integer.");
                    }
                }
            }
            case "TAG" -> {
                if (!p.containsKey("tagKey") || String.valueOf(p.get("tagKey")).isBlank()) {
                    errors.add("tagKey is required.");
                }
                if (!p.containsKey("nodeId") || String.valueOf(p.get("nodeId")).isBlank()) {
                    errors.add("nodeId is required (e.g. ns=2;s=Tag).");
                }
            }
            case "GROUP" -> {
                if (!p.containsKey("groupKey") || String.valueOf(p.get("groupKey")).isBlank()) {
                    errors.add("groupKey is required.");
                }
                if (!p.containsKey("tagKeys") || !(p.get("tagKeys") instanceof List)) {
                    errors.add("tagKeys must be a non-empty list of tag keys.");
                }
            }
            case "TEMPLATE" -> {
                if (!p.containsKey("templateCode") || String.valueOf(p.get("templateCode")).isBlank()) {
                    errors.add("templateCode is required.");
                }
            }
            default -> errors.add("Unknown targetType: " + request.targetType());
        }

        if (!errors.isEmpty()) {
            return OpcUaValidateResponse.failure(errors);
        }
        return OpcUaValidateResponse.success("Configuration payload is valid.");
    }

    // =========================================================================
    // 2. CLIENT CONFIG CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<OpcUaClientDto> getAllClients() {
        return clientRepository.findAll().stream().map(this::toClientDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OpcUaClientDto> getClientByCode(String code) {
        return clientRepository.findByClientCode(code).map(this::toClientDto);
    }

    @Transactional
    public OpcUaClientDto saveClient(OpcUaClientDto dto) {
        OpcUaClientConfigEntity entity = clientRepository.findByClientCode(dto.clientCode())
                .orElseGet(() -> OpcUaClientConfigEntity.builder().clientCode(dto.clientCode()).build());

        entity.setEndpointUrl(dto.endpointUrl());
        entity.setSecurityPolicy(dto.securityPolicy() != null ? dto.securityPolicy() : "NONE");
        entity.setAuthType(dto.authType() != null ? dto.authType() : "ANONYMOUS");
        entity.setUsername(dto.username());
        if (dto.password() != null && !dto.password().isBlank()) {
            entity.setPasswordEncrypted(dto.password());
        }
        entity.setKeystorePath(dto.keystorePath());
        entity.setCertificateAlias(dto.certificateAlias());
        entity.setRequestTimeoutMs(dto.requestTimeoutMs() != null ? dto.requestTimeoutMs() : 5000L);
        entity.setSessionTimeoutMs(dto.sessionTimeoutMs() != null ? dto.sessionTimeoutMs() : 60000L);
        entity.setReconnectIntervalMs(dto.reconnectIntervalMs() != null ? dto.reconnectIntervalMs() : 3000L);
        entity.setActive(dto.active());

        OpcUaClientConfigEntity saved = clientRepository.save(entity);
        return toClientDto(saved);
    }

    @Transactional
    public boolean deleteClient(String code) {
        return clientRepository.findByClientCode(code).map(entity -> {
            clientRepository.delete(entity);
            return true;
        }).orElse(false);
    }

    // =========================================================================
    // 3. SERVER CONFIG CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<OpcUaServerDto> getAllServers() {
        return serverRepository.findAll().stream().map(this::toServerDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OpcUaServerDto> getServerByCode(String code) {
        return serverRepository.findByServerCode(code).map(this::toServerDto);
    }

    @Transactional
    public OpcUaServerDto saveServer(OpcUaServerDto dto) {
        OpcUaServerConfigEntity entity = serverRepository.findByServerCode(dto.serverCode())
                .orElseGet(() -> OpcUaServerConfigEntity.builder().serverCode(dto.serverCode()).build());

        entity.setBindPort(dto.bindPort() != null ? dto.bindPort() : 4840);
        entity.setEndpointPath(dto.endpointPath() != null ? dto.endpointPath() : "/wcs/opcua");
        entity.setNamespaceUri(dto.namespaceUri() != null ? dto.namespaceUri() : "urn:company:warehouse:wcs");
        entity.setSupportedSecurityPolicies(dto.supportedSecurityPolicies() != null ? dto.supportedSecurityPolicies() : "NONE,BASIC256_SHA256");
        entity.setSupportedAuthTypes(dto.supportedAuthTypes() != null ? dto.supportedAuthTypes() : "ANONYMOUS,USERNAME_PASSWORD");
        entity.setAutoStart(dto.autoStart());
        entity.setActive(dto.active());

        OpcUaServerConfigEntity saved = serverRepository.save(entity);
        return toServerDto(saved);
    }

    @Transactional
    public boolean deleteServer(String code) {
        return serverRepository.findByServerCode(code).map(entity -> {
            serverRepository.delete(entity);
            return true;
        }).orElse(false);
    }

    // =========================================================================
    // 4. TAG MAPPING CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<OpcUaTagMappingDto> getAllTags() {
        return tagRepository.findAll().stream().map(this::toTagDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OpcUaTagMappingDto> getTagByKey(String key) {
        return tagRepository.findByTagKey(key).map(this::toTagDto);
    }

    @Transactional
    public OpcUaTagMappingDto saveTag(OpcUaTagMappingDto dto) {
        OpcUaTagMappingEntity entity = tagRepository.findByTagKey(dto.tagKey())
                .orElseGet(() -> OpcUaTagMappingEntity.builder().tagKey(dto.tagKey()).build());

        entity.setNodeId(dto.nodeId());
        entity.setDataType(dto.dataType() != null ? dto.dataType() : "STRING");
        entity.setAccessLevel(dto.accessLevel() != null ? dto.accessLevel() : "READ_WRITE");
        entity.setEquipmentCode(dto.equipmentCode());
        entity.setClientCode(dto.clientCode());
        entity.setServerCode(dto.serverCode());
        entity.setSamplingIntervalMs(dto.samplingIntervalMs() != null ? dto.samplingIntervalMs() : 250.0);
        entity.setDeadband(dto.deadband() != null ? dto.deadband() : 0.0);
        entity.setDescription(dto.description());

        OpcUaTagMappingEntity saved = tagRepository.save(entity);
        return toTagDto(saved);
    }

    @Transactional
    public boolean deleteTag(String key) {
        return tagRepository.findByTagKey(key).map(entity -> {
            tagRepository.delete(entity);
            return true;
        }).orElse(false);
    }

    // =========================================================================
    // 5. TAG GROUP CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<OpcUaTagGroupDto> getAllGroups() {
        return groupRepository.findAll().stream().map(this::toGroupDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<OpcUaTagGroupDto> getGroupByKey(String key) {
        return groupRepository.findByGroupKey(key).map(this::toGroupDto);
    }

    @Transactional
    public OpcUaTagGroupDto saveGroup(OpcUaTagGroupDto dto) {
        OpcUaTagGroupEntity entity = groupRepository.findByGroupKey(dto.groupKey())
                .orElseGet(() -> OpcUaTagGroupEntity.builder().groupKey(dto.groupKey()).build());

        entity.setDescription(dto.description());
        entity.setEquipmentCode(dto.equipmentCode());

        // Update items
        entity.getItems().clear();
        if (dto.tagKeys() != null) {
            for (int i = 0; i < dto.tagKeys().size(); i++) {
                entity.getItems().add(OpcUaTagGroupItemEntity.builder()
                        .group(entity)
                        .tagKey(dto.tagKeys().get(i))
                        .displayOrder(i)
                        .build());
            }
        }

        OpcUaTagGroupEntity saved = groupRepository.save(entity);
        return toGroupDto(saved);
    }

    @Transactional
    public boolean deleteGroup(String key) {
        return groupRepository.findByGroupKey(key).map(entity -> {
            groupRepository.delete(entity);
            return true;
        }).orElse(false);
    }

    // =========================================================================
    // DTO MAPPERS
    // =========================================================================

    private OpcUaClientDto toClientDto(OpcUaClientConfigEntity e) {
        return OpcUaClientDto.builder()
                .id(e.getId())
                .clientCode(e.getClientCode())
                .endpointUrl(e.getEndpointUrl())
                .securityPolicy(e.getSecurityPolicy())
                .authType(e.getAuthType())
                .username(e.getUsername())
                .keystorePath(e.getKeystorePath())
                .certificateAlias(e.getCertificateAlias())
                .requestTimeoutMs(e.getRequestTimeoutMs())
                .sessionTimeoutMs(e.getSessionTimeoutMs())
                .reconnectIntervalMs(e.getReconnectIntervalMs())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private OpcUaServerDto toServerDto(OpcUaServerConfigEntity e) {
        return OpcUaServerDto.builder()
                .id(e.getId())
                .serverCode(e.getServerCode())
                .bindPort(e.getBindPort())
                .endpointPath(e.getEndpointPath())
                .namespaceUri(e.getNamespaceUri())
                .supportedSecurityPolicies(e.getSupportedSecurityPolicies())
                .supportedAuthTypes(e.getSupportedAuthTypes())
                .autoStart(e.isAutoStart())
                .active(e.isActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private OpcUaTagMappingDto toTagDto(OpcUaTagMappingEntity e) {
        return OpcUaTagMappingDto.builder()
                .id(e.getId())
                .tagKey(e.getTagKey())
                .nodeId(e.getNodeId())
                .dataType(e.getDataType())
                .accessLevel(e.getAccessLevel())
                .equipmentCode(e.getEquipmentCode())
                .clientCode(e.getClientCode())
                .serverCode(e.getServerCode())
                .samplingIntervalMs(e.getSamplingIntervalMs())
                .deadband(e.getDeadband())
                .description(e.getDescription())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private OpcUaTagGroupDto toGroupDto(OpcUaTagGroupEntity e) {
        List<String> tags = (e.getItems() != null)
                ? e.getItems().stream().map(OpcUaTagGroupItemEntity::getTagKey).toList()
                : List.of();
        return OpcUaTagGroupDto.builder()
                .id(e.getId())
                .groupKey(e.getGroupKey())
                .description(e.getDescription())
                .equipmentCode(e.getEquipmentCode())
                .tagKeys(tags)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
