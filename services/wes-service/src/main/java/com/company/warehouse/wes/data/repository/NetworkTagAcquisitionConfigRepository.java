package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.NetworkTagAcquisitionConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NetworkTagAcquisitionConfigRepository extends JpaRepository<NetworkTagAcquisitionConfigEntity, UUID> {

    Optional<NetworkTagAcquisitionConfigEntity> findByTagId(UUID tagId);

    List<NetworkTagAcquisitionConfigEntity> findByTagIdIn(Collection<UUID> tagIds);

    void deleteByTagId(UUID tagId);
}
