package com.company.warehouse.wes.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "resource_template", schema = "wo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "template_code", nullable = false, unique = true, length = 60)
    private String templateCode;

    @Column(name = "template_name", nullable = false, length = 100)
    private String templateName;

    @Column(name = "category", nullable = false, length = 30)
    private String category; // 'PHYSICAL', 'SOFTWARE', 'VIRTUAL', 'LOGICAL'

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType; // 'CONVEYOR', 'TURNTABLE', 'AGV', 'PLC', etc.

    @Column(name = "communication_method", nullable = false, length = 50)
    private String communicationProtocol; // 'PLC_S7', 'MODBUS_TCP', 'TCP_SOCKET', 'SERIAL', 'REST', 'OPC_UA', 'MQTT/VDA5050', 'INTERNAL'

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "documentation_url", length = 500)
    private String documentationUrl;

    public String getCommunicationMethod() {
        return communicationProtocol;
    }

    public void setCommunicationMethod(String method) {
        this.communicationProtocol = method;
    }

    public static class ResourceTemplateEntityBuilder {
        public ResourceTemplateEntityBuilder communicationMethod(String method) {
            this.communicationProtocol = method;
            return this;
        }
    }

    // --- Backward Compatibility Helpers for Legacy Callers ---
    public String getApplication() {
        return "WO";
    }

    public void setApplication(String app) {
        // No-op: Sovereign WO does not lock templates to applications
    }

    public String getDefaultProtocol() {
        return "http";
    }

    public void setDefaultProtocol(String proto) {
        // Managed by OT Gateway
    }

    public String getDefaultHost() {
        return "127.0.0.1";
    }

    public void setDefaultHost(String host) {
        // Managed by OT Gateway
    }

    public int getDefaultPort() {
        return 8080;
    }

    public void setDefaultPort(int port) {
        // Managed by OT Gateway
    }

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "property_schema", nullable = false, columnDefinition = "jsonb")
    private String propertySchema = "[]";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_properties", nullable = false, columnDefinition = "jsonb")
    private String defaultProperties = "{}";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_commands", nullable = false, columnDefinition = "jsonb")
    private String supportedCommands = "[]";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "methods_schema", nullable = false, columnDefinition = "jsonb")
    private String methodsSchema = "[]";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
