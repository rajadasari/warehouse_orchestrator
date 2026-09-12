package com.company.warehouse.wes.infrastructure.client.wms.logging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Enterprise-grade HTTP Request & Response Logging Interceptor following IEC 62443 / Industrial Audit standards.
 * Safely captures full outbound payload sent to third-party WMS and inbound response body while masking secrets.
 */
@Slf4j
@Component
public class WmsHttpLoggingInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        long startTime = System.currentTimeMillis();
        String correlationId = request.getHeaders().getFirst("X-Correlation-ID");

        // 1. Log Outbound Request
        logRequest(request, body, correlationId);

        ClientHttpResponse response;
        try {
            response = execution.execute(request, body);
        } catch (IOException ex) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("\n========================== [OUTBOUND WMS CALL FAILED] ==========================\n" +
                    "Correlation ID : {}\n" +
                    "Target URI     : {} {}\n" +
                    "Duration       : {} ms\n" +
                    "Failure Cause  : {}\n" +
                    "================================================================================",
                    correlationId, request.getMethod(), request.getURI(), duration, ex.getMessage());
            throw ex;
        }

        long duration = System.currentTimeMillis() - startTime;

        // 2. Wrap response so the body stream can be read for logging without consuming it for the caller
        BufferingClientHttpResponseWrapper bufferedResponse = new BufferingClientHttpResponseWrapper(response);

        // 3. Log Inbound Response
        logResponse(bufferedResponse, request, duration, correlationId);

        return bufferedResponse;
    }

    private void logRequest(HttpRequest request, byte[] body, String correlationId) {
        String reqBody = (body != null && body.length > 0)
                ? maskSensitiveData(new String(body, StandardCharsets.UTF_8))
                : "[EMPTY]";

        // Mask Token in Headers
        String authHeader = request.getHeaders().getFirst("Authentication");
        String maskedAuth = maskToken(authHeader);

        log.info("\n========================== [OUTBOUND WMS REQUEST] ==========================\n" +
                "Correlation ID : {}\n" +
                "Method & URI   : {} {}\n" +
                "Headers        : [Content-Type: {}, Authentication: {}, Accept: {}]\n" +
                "Payload Body   :\n{}\n" +
                "----------------------------------------------------------------------------",
                correlationId,
                request.getMethod(),
                request.getURI(),
                request.getHeaders().getContentType(),
                maskedAuth,
                request.getHeaders().getAccept(),
                reqBody);
    }

    private void logResponse(BufferingClientHttpResponseWrapper response, HttpRequest request, long durationMs, String correlationId) {
        String resBody;
        try {
            resBody = response.getBodyAsString();
            if (resBody == null || resBody.trim().isEmpty()) {
                resBody = "[EMPTY]";
            }
        } catch (Exception e) {
            resBody = "[Could not read response body: " + e.getMessage() + "]";
        }

        int statusCode = 0;
        String statusText = "";
        try {
            statusCode = response.getStatusCode().value();
            statusText = response.getStatusText();
        } catch (Exception ignored) {}

        log.info("\n-------------------------- [INBOUND WMS RESPONSE] --------------------------\n" +
                "Correlation ID : {}\n" +
                "Target URI     : {} {}\n" +
                "Status         : {} {}\n" +
                "Duration       : {} ms\n" +
                "Response Body  :\n{}\n" +
                "============================================================================",
                correlationId,
                request.getMethod(),
                request.getURI(),
                statusCode,
                statusText,
                durationMs,
                resBody);
    }

    private String maskToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return "[NONE]";
        }
        if (token.length() <= 12) {
            return "******";
        }
        return token.substring(0, 6) + "..." + token.substring(token.length() - 4);
    }

    private String maskSensitiveData(String json) {
        if (json == null) return null;
        // Mask clientSecret if logging auth requests
        return json.replaceAll("(\"clientSecret\"\\s*:\\s*\")[^\"]+(\")", "$1******$2")
                   .replaceAll("(\"password\"\\s*:\\s*\")[^\"]+(\")", "$1******$2");
    }

    /**
     * Helper wrapper enabling multiple reads of the response body input stream.
     */
    private static class BufferingClientHttpResponseWrapper implements ClientHttpResponse {
        private final ClientHttpResponse delegate;
        private byte[] cachedBody;

        public BufferingClientHttpResponseWrapper(ClientHttpResponse delegate) {
            this.delegate = delegate;
        }

        @Override
        public InputStream getBody() throws IOException {
            if (cachedBody == null) {
                try (InputStream is = delegate.getBody()) {
                    cachedBody = is.readAllBytes();
                }
            }
            return new ByteArrayInputStream(cachedBody);
        }

        public String getBodyAsString() throws IOException {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(getBody(), StandardCharsets.UTF_8))) {
                return reader.lines().collect(Collectors.joining("\n"));
            }
        }

        @Override
        public org.springframework.http.HttpStatusCode getStatusCode() throws IOException {
            return delegate.getStatusCode();
        }

        @Override
        public String getStatusText() throws IOException {
            return delegate.getStatusText();
        }

        @Override
        public void close() {
            delegate.close();
        }

        @Override
        public org.springframework.http.HttpHeaders getHeaders() {
            return delegate.getHeaders();
        }
    }
}
