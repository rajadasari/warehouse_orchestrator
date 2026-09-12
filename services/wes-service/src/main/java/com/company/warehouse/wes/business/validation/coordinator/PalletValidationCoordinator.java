package com.company.warehouse.wes.business.validation.coordinator;

import com.company.warehouse.common.core.enums.ValidationTier;
import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.business.validation.model.PalletValidationContext;
import com.company.warehouse.wes.business.validation.model.ValidationResult;
import com.company.warehouse.wes.business.validation.spi.PalletSubValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PalletValidationCoordinator {

    private final List<PalletSubValidator> subValidators;

    /**
     * Executes 3-tier validation on an incoming pallet submission.
     */
    public ValidationResult validate(InboundPalletSubmissionRequest request, PalletValidationContext context) {
        ValidationResult result = new ValidationResult();

        log.info("Starting 3-tier validation for Pallet LPN: {}, Item: {}, PalletType: {}",
                request.getPalletLpn(), request.getItemCode(), request.getPalletTypeCode());

        // --- TIER 1: IDENTITY & EXISTENCE ---
        executeTier(ValidationTier.TIER_1_IDENTITY, context, result);
        if (result.isRejected()) {
            log.warn("Pallet LPN {} failed Tier 1 validation. Halting further checks. Rejections: {}",
                    request.getPalletLpn(), result.getErrors().size());
            return result;
        }

        // --- TIER 2: CAPACITY & COMPATIBILITY ---
        executeTier(ValidationTier.TIER_2_CAPACITY, context, result);

        // --- TIER 3: BUSINESS POLICIES & COMPLIANCE ---
        executeTier(ValidationTier.TIER_3_POLICY, context, result);

        log.info("Validation completed for Pallet LPN {}. Verdict: {}, Errors: {}, Warnings: {}, Infos: {}",
                request.getPalletLpn(), result.getOutcome(),
                result.getErrors().size(), result.getWarnings().size(), result.getInfos().size());

        return result;
    }

    private void executeTier(ValidationTier tier, PalletValidationContext context, ValidationResult result) {
        subValidators.stream()
                .filter(v -> v.getTier() == tier && v.supports(context))
                .sorted(Comparator.comparingInt(PalletSubValidator::getOrder))
                .forEach(v -> {
                    try {
                        v.validate(context, result);
                    } catch (Exception e) {
                        log.error("Validator {} failed with unexpected error", v.getClass().getSimpleName(), e);
                        result.addReject("VALIDATOR_EXCEPTION",
                                "Validation check " + v.getClass().getSimpleName() + " failed: " + e.getMessage(),
                                null);
                    }
                });
    }
}
