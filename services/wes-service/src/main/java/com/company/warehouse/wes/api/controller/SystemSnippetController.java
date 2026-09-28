package com.company.warehouse.wes.api.controller;

import com.company.warehouse.wes.business.resource.snippet.SnippetExecutionContext;
import com.company.warehouse.wes.business.resource.snippet.SnippetExecutionResult;
import com.company.warehouse.wes.business.resource.snippet.SystemSnippet;
import com.company.warehouse.wes.business.resource.snippet.SystemSnippetRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API for discovering and simulating System Snippets.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/snippets")
@RequiredArgsConstructor
@Tag(name = "System Snippets", description = "Discovery and execution simulation for standard industrial snippets")
public class SystemSnippetController {

    private final SystemSnippetRegistry snippetRegistry;

    @GetMapping
    @Operation(summary = "List all available system snippets across categories")
    public ResponseEntity<List<Map<String, Object>>> listSnippets(
            @RequestParam(required = false) String category) {
        List<SystemSnippet> snippets = category != null
                ? snippetRegistry.getSnippetsByCategory(category)
                : snippetRegistry.getAllSnippets();

        List<Map<String, Object>> response = snippets.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getSnippetId());
            m.put("name", s.getDisplayName());
            m.put("category", s.getCategory());
            m.put("description", s.getDescription());
            m.put("parametersSchema", s.getParametersSchema());
            m.put("outputSchema", s.getOutputSchema());
            return m;
        }).toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{snippetId}")
    @Operation(summary = "Get snippet metadata by ID")
    public ResponseEntity<Map<String, Object>> getSnippet(@PathVariable String snippetId) {
        return snippetRegistry.getSnippet(snippetId)
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", s.getSnippetId());
                    m.put("name", s.getDisplayName());
                    m.put("category", s.getCategory());
                    m.put("description", s.getDescription());
                    m.put("parametersSchema", s.getParametersSchema());
                    m.put("outputSchema", s.getOutputSchema());
                    return ResponseEntity.ok(m);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{snippetId}/simulate")
    @Operation(summary = "Simulate running a snippet with test parameters and properties")
    public ResponseEntity<SnippetExecutionResult> simulateSnippet(
            @PathVariable String snippetId,
            @RequestBody(required = false) Map<String, Object> payload) {

        SystemSnippet snippet = snippetRegistry.getSnippet(snippetId)
                .orElse(null);

        if (snippet == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> safePayload = payload != null ? payload : Map.of();
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = safePayload.get("resourceProperties") instanceof Map
                ? (Map<String, Object>) safePayload.get("resourceProperties") : Map.of();
        @SuppressWarnings("unchecked")
        Map<String, Object> params = safePayload.get("inputParameters") instanceof Map
                ? (Map<String, Object>) safePayload.get("inputParameters") : Map.of();

        SnippetExecutionContext context = new SnippetExecutionContext(
                String.valueOf(safePayload.getOrDefault("resourceId", "SIMULATED_RES")),
                String.valueOf(safePayload.getOrDefault("methodId", "TEST_METHOD")),
                properties,
                params
        );

        SnippetExecutionResult result = snippet.execute(context);
        return ResponseEntity.ok(result);
    }
}
