package com.company.warehouse.wes.infrastructure.client.wms.config;

import com.company.warehouse.wes.infrastructure.client.wms.auth.WmsAuthInterceptor;
import com.company.warehouse.wes.infrastructure.client.wms.logging.WmsHttpLoggingInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class WmsRestClientConfig {

    @Bean(name = "wmsRestClient")
    public RestClient wmsRestClient(
            WmsClientProperties properties, 
            WmsAuthInterceptor authInterceptor,
            WmsHttpLoggingInterceptor loggingInterceptor) {
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
