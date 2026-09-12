package com.company.warehouse.wes.business.validation.model;

import com.company.warehouse.wes.api.dto.InboundPalletSubmissionRequest;
import com.company.warehouse.wes.data.entity.ItemMasterEntity;
import com.company.warehouse.wes.data.entity.PalletTypeMasterEntity;
import com.company.warehouse.wes.data.entity.SkuMasterEntity;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
public class PalletValidationContext {

    private final InboundPalletSubmissionRequest request;

    // Enriched entities resolved during validation
    private PalletTypeMasterEntity resolvedPalletType;
    private ItemMasterEntity resolvedItem;
    private SkuMasterEntity resolvedSku;

    public PalletValidationContext(InboundPalletSubmissionRequest request) {
        this.request = request;
    }

    public String getPalletLpn() {
        return request.getPalletLpn();
    }

    public String getLoadType() {
        return request.getLoadType();
    }

    public String getInboundType() {
        return request.getInboundType();
    }

    public String getPalletTypeCode() {
        return request.getPalletTypeCode();
    }

    public String getItemCode() {
        return request.getItemCode();
    }

    public String getSkuCode() {
        return request.getSkuCode();
    }

    public BigDecimal getQuantity() {
        return request.getQuantity();
    }

    public String getLotNumber() {
        return request.getLotNumber();
    }

    public LocalDate getExpiryDate() {
        return request.getExpiryDate();
    }

    public BigDecimal getActualWeightKg() {
        return request.getActualWeightKg();
    }

    public String getSourceLocation() {
        return request.getSourceLocation();
    }

    public String getOperatorId() {
        return request.getOperatorId();
    }

    public Map<String, Object> getCustomAttributes() {
        return request.getCustomAttributes();
    }
}
