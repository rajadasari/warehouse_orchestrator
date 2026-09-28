package com.company.warehouse.wes.business.resource.snippet;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * In-memory registry of all standard industrial system snippets.
 * Automatically injects all Spring-managed SystemSnippet beans.
 */
@Slf4j
@Component
public class SystemSnippetRegistry {

    private final Map<String, SystemSnippet> snippets = new LinkedHashMap<>();

    public SystemSnippetRegistry(List<SystemSnippet> snippetList) {
        if (snippetList != null) {
            for (SystemSnippet s : snippetList) {
                snippets.put(s.getSnippetId().toUpperCase(), s);
                log.info("Registered System Snippet: '{}' [{}]", s.getSnippetId(), s.getDisplayName());
            }
        }
    }

    public Optional<SystemSnippet> getSnippet(String snippetId) {
        if (snippetId == null) return Optional.empty();
        return Optional.ofNullable(snippets.get(snippetId.trim().toUpperCase()));
    }

    public List<SystemSnippet> getAllSnippets() {
        return new ArrayList<>(snippets.values());
    }

    public List<SystemSnippet> getSnippetsByCategory(String category) {
        if (category == null) return getAllSnippets();
        return snippets.values().stream()
                .filter(s -> category.equalsIgnoreCase(s.getCategory()))
                .toList();
    }
}
