package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.NetworkDeviceTagEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NetworkDeviceTagRepository extends JpaRepository<NetworkDeviceTagEntity, UUID> {

    List<NetworkDeviceTagEntity> findByChannelId(UUID channelId);

    Optional<NetworkDeviceTagEntity> findByChannelIdAndNodeId(UUID channelId, String nodeId);

    List<NetworkDeviceTagEntity> findByChannelIdAndFolderPath(UUID channelId, String folderPath);

    int countByChannelId(UUID channelId);

    List<NetworkDeviceTagEntity> findByParentTagId(UUID parentTagId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByParentTagId(UUID parentTagId);
}
