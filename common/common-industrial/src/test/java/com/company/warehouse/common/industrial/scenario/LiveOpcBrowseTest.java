package com.company.warehouse.common.industrial.scenario;

import org.eclipse.milo.opcua.sdk.client.OpcUaClient;
import org.eclipse.milo.opcua.stack.core.types.builtin.DataValue;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.eclipse.milo.opcua.stack.core.types.enumerated.TimestampsToReturn;
import org.junit.jupiter.api.Test;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

public class LiveOpcBrowseTest {

    record TagInfo(String nodeId, String browseName, String nodeClass, String sampleValue) {}

    @Test
    void browseLivePlc() {
        String endpoint = "opc.tcp://10.15.62.226:4840";
        System.out.println("Connecting to live PLC at " + endpoint + "...");
        List<TagInfo> collectedTags = new ArrayList<>();

        try {
            OpcUaClient client = OpcUaClient.create(endpoint);
            client.connect().get();
            System.out.println("Successfully connected to PLC!");

            // Test and read known tags under ns=3 passing TimestampsToReturn.Both explicitly
            String[] tagsToInspect = {
                    "ns=3;s=Manufacturer",
                    "ns=3;s=Model",
                    "ns=3;s=OrderNumber",
                    "ns=3;s=SerialNumber",
                    "ns=3;s=SoftwareRevision",
                    "ns=3;s=HardwareRevision",
                    "ns=3;s=DeviceRevision",
                    "ns=3;s=OperatingMode",
                    "ns=3;s=EngineeringRevision",
                    "ns=3;s=RevisionCounter"
            };

            for (String tagStr : tagsToInspect) {
                try {
                    NodeId nid = NodeId.parse(tagStr);
                    DataValue dv = client.readValue(0.0, TimestampsToReturn.Both, nid).get();
                    String val = (dv != null && dv.getValue() != null && dv.getValue().getValue() != null)
                            ? String.valueOf(dv.getValue().getValue()) : "null";
                    System.out.println("TAG: " + tagStr + " = " + val);

                    collectedTags.add(new TagInfo(
                            tagStr,
                            tagStr.substring(tagStr.lastIndexOf("=") + 1),
                            "Variable",
                            val
                    ));
                } catch (Exception e) {
                    System.err.println("Could not read " + tagStr + ": " + e.getMessage());
                }
            }

            // Also add standard DB / IO containers
            String[] containers = {
                    "ns=3;s=DataBlocksGlobal",
                    "ns=3;s=Inputs",
                    "ns=3;s=Outputs",
                    "ns=3;s=Memory",
                    "ns=3;s=Timers",
                    "ns=3;s=Counters"
            };
            for (String c : containers) {
                collectedTags.add(new TagInfo(c, c.substring(c.lastIndexOf("=") + 1), "Container", "N/A"));
            }

            try (PrintWriter pw = new PrintWriter(new FileWriter("plc_tags.json"))) {
                pw.println("[");
                for (int i = 0; i < collectedTags.size(); i++) {
                    TagInfo t = collectedTags.get(i);
                    pw.printf("  {\"nodeId\": \"%s\", \"browseName\": \"%s\", \"nodeClass\": \"%s\", \"value\": \"%s\"}%s%n",
                            escape(t.nodeId()), escape(t.browseName()), escape(t.nodeClass()), escape(t.sampleValue()),
                            (i < collectedTags.size() - 1 ? "," : ""));
                }
                pw.println("]");
            }

            client.disconnect().get();
        } catch (Exception e) {
            System.err.println("Failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
