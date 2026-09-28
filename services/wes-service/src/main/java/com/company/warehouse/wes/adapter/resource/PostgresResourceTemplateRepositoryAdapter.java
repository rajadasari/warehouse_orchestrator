package com.company.warehouse.wes.adapter.resource;

import com.company.warehouse.wes.business.resource.composer.EntityComposerMapper;
import com.company.warehouse.wes.business.resource.composer.model.ComposedEntityTemplate;
import com.company.warehouse.wes.data.entity.ResourceTemplateEntity;
import com.company.warehouse.wes.data.repository.ResourceTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.platform.resourcemanager.application.port.ResourceTemplateRepositoryPort;
import org.platform.resourcemanager.domain.template.ResourceTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * PostgreSQL persistence adapter implementing the common-resource ResourceTemplateRepositoryPort.
 * Bridges domain ResourceTemplate aggregates directly to the existing wo.resource_template table.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostgresResourceTemplateRepositoryAdapter implements ResourceTemplateRepositoryPort {

    private final ResourceTemplateRepository templateRepository;
    private final EntityComposerMapper composerMapper;

    @Override
    @Transactional
    public void save(ResourceTemplate template) {
        if (template == null) return;
        ComposedEntityTemplate composed = ComposedEntityTemplate.fromDomainTemplate(template);
        ResourceTemplateEntity entity = composerMapper.toEntity(composed);
        templateRepository.save(entity);
        log.info("Persisted domain ResourceTemplate '{}' to PostgreSQL", template.templateCode());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ResourceTemplate> findByCode(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) return Optional.empty();
        return templateRepository.findByTemplateCode(templateCode.trim().toUpperCase())
                .map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceTemplate> findAll() {
        return templateRepository.findAll().stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceTemplate> findByCategory(String category) {
        if (category == null || category.isBlank()) return findAll();
        return templateRepository.findByCategoryIgnoreCase(category.trim()).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByCode(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) return false;
        return templateRepository.existsByTemplateCode(templateCode.trim().toUpperCase());
    }

    @Override
    @Transactional
    public boolean deleteByCode(String templateCode) {
        if (templateCode == null || templateCode.isBlank()) return false;
        String code = templateCode.trim().toUpperCase();
        if (templateRepository.existsByTemplateCode(code)) {
            templateRepository.deleteByTemplateCode(code);
            return true;
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public long count() {
        return templateRepository.count();
    }

    private ResourceTemplate toDomain(ResourceTemplateEntity entity) {
        ComposedEntityTemplate composed = composerMapper.toComposedTemplate(entity);
        return composed.toDomainTemplate();
    }
}
