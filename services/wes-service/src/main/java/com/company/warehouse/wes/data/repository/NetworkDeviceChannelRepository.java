package com.company.warehouse.wes.data.repository;

import com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NetworkDeviceChannelRepository extends JpaRepository<NetworkDeviceChannelEntity, UUID> {

    Optional<NetworkDeviceChannelEntity> findByChannelCode(String channelCode);

    List<NetworkDeviceChannelEntity> findByProtocol(String protocol);

    List<NetworkDeviceChannelEntity> findByStatus(String status);
}
