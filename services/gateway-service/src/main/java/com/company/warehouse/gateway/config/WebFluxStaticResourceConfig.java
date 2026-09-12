package com.company.warehouse.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.config.ResourceHandlerRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;

import java.io.File;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;

@Configuration
public class WebFluxStaticResourceConfig implements WebFluxConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations(
                        "file:static-ui/",
                        "file:./static-ui/",
                        "file:C:/warehouse-platform/static-ui/",
                        "classpath:/static/"
                );
    }

    @Bean
    public RouterFunction<ServerResponse> indexRouter() {
        return RouterFunctions.route(
            GET("/").or(GET("/index.html")),
            request -> {
                File[] candidates = new File[] {
                    new File("static-ui/index.html"),
                    new File("C:/warehouse-platform/static-ui/index.html")
                };
                for (File f : candidates) {
                    if (f.exists()) {
                        return ServerResponse.ok().contentType(MediaType.TEXT_HTML).bodyValue(new FileSystemResource(f));
                    }
                }
                return ServerResponse.ok().contentType(MediaType.TEXT_HTML)
                        .bodyValue("<html><body><h2>Warehouse Platform Gateway</h2><p>Static UI loading...</p></body></html>");
            }
        );
    }
}
