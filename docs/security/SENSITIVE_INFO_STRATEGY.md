# Sensitive Information & Cybersecurity Handling Strategy

## 1. Purpose & Security Principles

This document establishes the mandatory controls for protecting **sensitive, confidential, and safety-critical information** across the **Warehouse Orchestrator Platform**. It aligns with **IEC 62443-4-2 (IACS Security)** and **OWASP Top 10** requirements.

The platform enforces four core security principles:
1. **Zero Plaintext Secrets**: No secret, token, key, or credential may ever exist in plaintext in source code, version control, configuration files, or logs.
2. **Defense in Depth**: Secrets are secured at rest, in transit, in memory, and across process boundaries.
3. **Principle of Least Privilege**: Services and users access only the minimum data required for their specific function.
4. **Non-Repudiation**: All administrative overrides and physical setpoint changes are permanently audited.

---

## 2. Sensitive Data Classification Matrix

| Classification Level | Examples in Warehouse Orchestrator | Storage Mechanism | Transmission Security |
| :--- | :--- | :--- | :--- |
| **Tier 1: Critical Secrets** | DB passwords, JWT private keys, Mosquitto TLS keystores, OPC UA private keys, API secrets. | HashiCorp Vault / Kubernetes Secrets (Injected as ENV). | Never transmitted over HTTP; mTLS only. |
| **Tier 2: Protected PII & Commercial** | Customer shipping addresses, recipient phone numbers, billing data, employee PINs. | PostgreSQL with AES-256-GCM column encryption. | HTTPS (TLS 1.3), masked in application logs. |
| **Tier 3: Operational Sensitive** | Factory floor setpoints, PLC node IDs, warehouse location layouts, equipment topologies. | Standard PostgreSQL tables with tenant/facility isolation. | Encrypted internal mTLS / OPC UA `Basic256Sha256`. |
| **Tier 4: Public / Internal Operational** | Item descriptions, SKU dimensions, bin coordinates, conveyor status (RUNNING/IDLE). | Standard unencrypted PostgreSQL / Redis tables. | Standard internal service-to-service channels. |

---

## 3. Secrets Management & Runtime Injection

### 3.1. Development vs. Production Lifecycle

```
[Local Development]          ──> .env.local (Git-ignored) / Testcontainers auto-generated secrets
[CI/CD Build Pipeline]       ──> GitHub Actions Encrypted Secrets / Vault AppRole
[Production Bare-Metal / K8s] ──> Local Encrypted Vault / Windows Credential Manager ──> Injected as Environment Variables
```

* **Version Control Guarantee**: 
  - The repository includes only template files (`application.yml` using `${ENV_VAR}` place-holders or `.env.example` containing synthetic dummy values).
  - Committing `.env`, `.pem`, `.jks`, `.key`, or `.p12` files to Git is strictly prohibited and blocked by pre-commit hooks.

### 3.2. Spring Boot Secret Consumption
Properties must be injected strictly through environment variables into typed `@ConfigurationProperties` records:

```yaml
# application-prod.yml (SAFE)
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:warehouse}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
mqtt:
  mosquitto:
    host: ${MOSQUITTO_HOST:localhost}
    port: ${MOSQUITTO_PORT:8883}
    ssl:
      trust-store: ${MOSQUITTO_TRUSTSTORE_PATH}
      trust-store-password: ${MOSQUITTO_TRUSTSTORE_PASSWORD}
```

---

## 4. In-Transit & Southbound Encryption Standards

1. **Northbound (Web / Mobile Scanners)**:
   - Enforce **HTTPS with TLS 1.3** (TLS 1.2 minimum). Disable insecure ciphers (RC4, 3DES, CBC modes).
   - Enforce HTTP Strict Transport Security (HSTS): `max-age=31536000; includeSubDomains`.
2. **Southbound (PLCs, Sorters, Edge Gateways - IEC 62541)**:
   - OPC UA communication via Eclipse Milo must mandate `SecurityPolicy.Basic256Sha256` or `Aes128_Sha256_RsaOaep`.
   - `SecurityPolicy.None` is **strictly banned** outside of isolated local mock tests.
3. **East-West & IoT (Microservices & Mosquitto MQTT)**:
   - Mutual TLS (mTLS) with internal PKI certificates managed via Spring Boot 3.1+ SSL Bundles. Port 8883 with certificate verification for all MQTT traffic.

---

## 5. Column-Level Encryption at Rest (JPA)

For Tier 2 sensitive data (e.g., third-party supplier API keys, customer credentials), encrypt fields at the JPA boundary using AES-256-GCM before writing to PostgreSQL:

```java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private final CryptoService cryptoService; // Injected AES-256-GCM engine

    @Override
    public String convertToDatabaseColumn(String rawAttribute) {
        return rawAttribute == null ? null : cryptoService.encrypt(rawAttribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData == null ? null : cryptoService.decrypt(dbData);
    }
}
```

---

## 6. Log Sanitization & Redaction Rules

Application logs must never become a side-channel leak for sensitive data. 

### 6.1. Prohibited Logging Patterns
The following data items are strictly forbidden from appearing in log statements:
* Plaintext passwords, bearer tokens, and JWT strings.
* HTTP `Authorization`, `Cookie`, and `Set-Cookie` headers.
* Credit card numbers, bank details, and customer tax IDs.
* Industrial cryptographic keys and PLC connection credentials.

### 6.2. Automated Logback Masking Configuration
In `logback-spring.xml`, enforce a custom regex masking converter for all console and JSON appenders:

```xml
<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [traceId=%X{traceId}] %-5level %logger{36} - %replace(%msg){'("password"|"token"|"authorization")\s*:\s*".*?"', '$1:"***REDACTED***"'}%n</pattern>
```

---

## 7. Developer & AI Agent Guardrails

All human developers and AI pair programmers must strictly adhere to the following operational constraints:
1. **Never generate real credentials**: When writing unit tests, sample requests, or documentation, always use synthetic placeholders (e.g., `sk_test_mock_123456789`, `user@example.com`).
2. **Never echo `.env` contents**: If diagnosing an environment issue, never dump or print the values of environment variables matching `*KEY*`, `*SECRET*`, `*PASSWORD*`, or `*TOKEN*`.
3. **Always use SecureRandom**: For generating nonces, correlation IDs, or temporary tokens, never use `java.util.Random` or `Math.random()`. Use `java.security.SecureRandom`.
