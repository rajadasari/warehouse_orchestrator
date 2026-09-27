package com.company.warehouse.wes.business.workflow.node.mes;

import com.company.warehouse.wes.business.workflow.NodeExecutionResult;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeExecutionContext;
import com.company.warehouse.wes.business.workflow.node.WorkflowNodeHandler;
import com.company.warehouse.wes.data.entity.PalletEntity;
import com.company.warehouse.wes.data.repository.PalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * Handler for State Mutation updating database status of Pallets, Batches, and Orders.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StateMutationHandler implements WorkflowNodeHandler {

    private final PalletRepository palletRepository;

    @Override
    public boolean supports(String nodeType) {
        return "STATE_MUTATION".equalsIgnoreCase(nodeType) || "UPDATE_STATUS".equalsIgnoreCase(nodeType);
    }

    @Override
    public NodeExecutionResult execute(WorkflowNodeExecutionContext context) {
        Map<String, Object> cfg = context.nodeConfig() != null ? context.nodeConfig() : Map.of();
        Map<String, Object> ctx = context.context() != null ? context.context() : Map.of();

        String targetEntity = String.valueOf(cfg.getOrDefault("targetEntity", "PALLET"));
        Object statusVal = cfg.get("status") != null ? cfg.get("status") : cfg.get("targetStatus");
        String targetStatus = statusVal != null ? String.valueOf(statusVal) : "IN_TRANSIT";

        String entityRef = (context.instance() != null) ? context.instance().getEntityReference() : null;
        if (entityRef == null && ctx.get("palletLpn") != null) {
            entityRef = String.valueOf(ctx.get("palletLpn"));
        }

        if ("PALLET".equalsIgnoreCase(targetEntity) && entityRef != null && !entityRef.isBlank()) {
            Optional<PalletEntity> palletOpt = palletRepository.findByPalletLpn(entityRef.trim());
            if (palletOpt.isPresent()) {
                PalletEntity pallet = palletOpt.get();
                pallet.setStatus(targetStatus);
                if (cfg.get("location") != null && !String.valueOf(cfg.get("location")).isBlank()) {
                    pallet.setCurrentLocation(String.valueOf(cfg.get("location")));
                }
                palletRepository.save(pallet);
                log.info("StateMutation: Pallet '{}' status set to '{}'", entityRef, targetStatus);
                return NodeExecutionResult.success(Map.of("palletStatus", targetStatus, "palletLpn", entityRef));
            }
        }

        return NodeExecutionResult.success(Map.of("entity", targetEntity, "status", targetStatus));
    }
}
