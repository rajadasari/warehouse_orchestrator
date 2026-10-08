package com.company.warehouse.wes.business.network;

import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseDirection;
import org.eclipse.milo.opcua.stack.core.types.enumerated.BrowseResultMask;
import org.eclipse.milo.opcua.stack.core.types.enumerated.NodeClass;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseDescription;
import org.eclipse.milo.opcua.stack.core.types.structured.BrowseResult;
import org.eclipse.milo.opcua.stack.core.types.structured.ReferenceDescription;
import org.junit.jupiter.api.Test;

import static org.eclipse.milo.opcua.stack.core.types.builtin.unsigned.Unsigned.uint;

class LivePlcUdtBrowseTest {

    @Test
    void inspectPlcDataBlocks() {
        String endpoint = "opc.tcp://10.15.62.226:4840";
        try {
            OpcUaClient client = OpcUaClient.create(endpoint);
            client.connect().get();
            System.out.println("CONNECTED TO PLC!");

            // Check what is currently in DB for channel or browse root
            NodeId dbRoot = new NodeId(3, "\"DataBlocksGlobal\"");
            browseAndPrint(client, dbRoot, 0, 4);

            client.disconnect().get();
        } catch (Exception e) {
            e.printStackTrace();
        }

        LiveOpcUaChannelDriver driver = new LiveOpcUaChannelDriver();
        var ch = com.company.warehouse.wes.data.entity.NetworkDeviceChannelEntity.builder()
                .id(java.util.UUID.randomUUID())
                .channelCode("TEST")
                .endpointUrl(endpoint)
                .protocol("OPC_UA")
                .securityPolicy("None")
                .build();
        java.util.List<com.company.warehouse.wes.data.entity.NetworkDeviceTagEntity> tags = driver.browseLiveAddressSpace(ch);
        System.out.println("TOTAL DISCOVERED TAGS: " + tags.size());
        for (var t : tags) {
            System.out.println("TAG: " + t.getTagName() + " | NodeId: " + t.getNodeId() + " | DataType: " + t.getDataType() + " | Folder: " + t.getFolderPath());
        }
    }

    private void browseAndPrint(OpcUaClient client, NodeId nodeId, int depth, int maxDepth) {
        if (depth > maxDepth) return;
        try {
            BrowseDescription desc = new BrowseDescription(
                    nodeId,
                    BrowseDirection.Forward,
                    NodeId.NULL_VALUE,
                    true,
                    uint(0x3F),
                    uint(BrowseResultMask.All.getValue())
            );
            BrowseResult result = client.browse(desc).get();
            if (result.getReferences() != null) {
                for (ReferenceDescription ref : result.getReferences()) {
                    String name = ref.getBrowseName().getName();
                    if ("Icon".equals(name)) continue;
                    String indent = "  ".repeat(depth);
                    NodeId childId = ref.getNodeId().toNodeId(client.getNamespaceTable()).orElse(null);
                    System.out.println(indent + "+ [" + ref.getNodeClass() + "] " + name + " -> " + childId);
                    if (childId != null) {
                        browseAndPrint(client, childId, depth + 1, maxDepth);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error at " + nodeId + ": " + e.getMessage());
        }
    }
}
