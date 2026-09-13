package com.company.warehouse.common.client.software.client;

import com.company.warehouse.common.client.software.auth.AuthInterceptor;
import com.company.warehouse.common.client.software.logging.HttpLoggingInterceptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Universal RestClient configuration for external software integrations.
 */
@Configuration
public class RestClientConfig {

    @Bean(name = {"externalSoftwareRestClient", "wmsRestClient"})
    @ConditionalOnMissingBean(name = "externalSoftwareRestClient")
    public RestClient externalSoftwareRestClient(
            ClientConnectionProperties properties,
            AuthInterceptor authInterceptor,
            HttpLoggingInterceptor loggingInterceptor) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
        requestFactory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .requestInterceptor(authInterceptor)
                .requestInterceptor(loggingInterceptor)
                .build();
    }
}
