package com.company.warehouse.wes.business.spi.wms;

import com.company.warehouse.wes.business.spi.wms.model.CreateOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.PalletPreAnnounceCommand;
import com.company.warehouse.wes.business.spi.wms.model.ReserveOrderCommand;
import com.company.warehouse.wes.business.spi.wms.model.SendToOutboundCommand;
import com.company.warehouse.wes.business.spi.wms.model.WmsOrderResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsOutboundResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsPreAnnounceResult;
import com.company.warehouse.wes.business.spi.wms.model.WmsReserveResult;

/**
 * Service Provider Interface (SPI) decoupling WES business workflows from
 * the concrete Third-Party WMS REST/IDoc/gRPC communications.
 */
public interface WmsIntegrationSpi {

    /**
     * Pre-announce pallet arrival to Third-Party WMS.
     */
    WmsPreAnnounceResult preAnnouncePallet(PalletPreAnnounceCommand command);

    /**
     * Create an order in Third-Party WMS for this pallet flow.
     */
    WmsOrderResult createOrder(CreateOrderCommand command);

    /**
     * Reserve stock/pallet allocation against the created order in WMS.
     */
    WmsReserveResult reserveOrder(ReserveOrderCommand command);

    /**
     * Send/release pallet to outbound staging or dispatch lane in WMS.
     */
    WmsOutboundResult sendToOutbound(SendToOutboundCommand command);
}
