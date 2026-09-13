package com.company.warehouse.wes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.company.warehouse")
public class WesServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(WesServiceApplication.class, args);
    }
}
