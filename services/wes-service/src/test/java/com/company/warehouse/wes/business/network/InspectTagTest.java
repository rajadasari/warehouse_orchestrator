package com.company.warehouse.wes.business.network;

import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.junit.jupiter.api.Test;

import java.util.concurrent.TimeUnit;

class InspectTagTest {

    @Test
    void testDirectTagRead() {
        String endpoint = "opc.tcp://10.15.62.226:4840";
        try {
            OpcUaClient client = OpcUaClient.create(endpoint);
            client.connect().get(5, TimeUnit.SECONDS);
            System.out.println("=== CONNECTED SUCCESSFULLY ===");

            // 1. Print Namespace Table
            var nsTable = client.getNamespaceTable();
            System.out.println("=== NAMESPACE TABLE ===");
            for (int i = 0; i < nsTable.toArray().length; i++) {
                System.out.println("ns=" + i + " -> " + nsTable.getUri(i));
            }

            // 2. Test reading exact tag
            String tag1 = "ns=3;s=\"CONVEYOR_PC_IF\".\"DecisionOP\"[2].\"State\"";
            System.out.println("\nTesting parse: " + tag1);
            NodeId nid1 = NodeId.parse(tag1);
            System.out.println("Parsed NodeId: " + nid1 + " (ns=" + nid1.getNamespaceIndex() + ", identifier=" + nid1.getIdentifier() + ", type=" + nid1.getType() + ")");

            DataValue dv1 = client.readValue(0.0, TimestampsToReturn.Both, nid1).get(3, TimeUnit.SECONDS);
            System.out.println("Read Result for tag1: Status=" + dv1.getStatusCode() + ", Value=" + dv1.getValue());

            // 3. Test variations (without quotes, different namespace, etc.)
            String[] variations = {
                "ns=3;s=CONVEYOR_PC_IF.DecisionOP[2].State",
                "ns=3;s=\"CONVEYOR_PC_IF\".\"DecisionOP[2]\".\"State\"",
                "ns=3;s=\"CONVEYOR_PC_IF\".DecisionOP[2].State",
                "ns=3;s=\"DataBlocksGlobal\".\"CONVEYOR_PC_IF\".\"DecisionOP\"[2].\"State\"",
                "ns=2;s=\"CONVEYOR_PC_IF\".\"DecisionOP\"[2].\"State\"",
                "ns=1;s=\"CONVEYOR_PC_IF\".\"DecisionOP\"[2].\"State\"",
                "ns=3;s=\"CONVEYOR_PC_IF\""
            };

            for (String v : variations) {
                try {
                    NodeId nid = NodeId.parse(v);
                    DataValue dv = client.readValue(0.0, TimestampsToReturn.Both, nid).get(2, TimeUnit.SECONDS);
                    System.out.println("Variation [" + v + "] -> Status=" + dv.getStatusCode() + ", Value=" + dv.getValue());
                } catch (Exception ex) {
                    System.out.println("Variation [" + v + "] -> Exception: " + ex.getMessage());
                }
            }

            client.disconnect().get();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
