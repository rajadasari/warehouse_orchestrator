package com.company.warehouse.wes.business.network;

import org.eclipse.milo.opcua.stack.core.types.builtin.ByteString;
import org.eclipse.milo.opcua.stack.core.types.builtin.ExtensionObject;
import org.eclipse.milo.opcua.stack.core.types.builtin.LocalizedText;
import org.eclipse.milo.opcua.stack.core.types.builtin.NodeId;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OpcUaValueHelperTest {

    @Test
    void testLocalizedTextExtraction() {
        LocalizedText lt = LocalizedText.english("Siemens AG");
        Object val = OpcUaValueHelper.sanitizeAndExtractValue(lt);
        assertThat(val).isEqualTo("Siemens AG");
    }

    @Test
    void testPrimitiveArrayExtraction() {
        int[] arr = new int[]{10, 20, 30};
        Object val = OpcUaValueHelper.sanitizeAndExtractValue(arr);
        assertThat(val).isInstanceOf(List.class);
        @SuppressWarnings("unchecked")
        List<Object> list = (List<Object>) val;
        assertThat(list).hasSize(3);
        assertThat(list.get(0)).isEqualTo(10);
        assertThat(list.get(1)).isEqualTo(20);
        assertThat(list.get(2)).isEqualTo(30);
    }

    @Test
    void testExtensionObjectArrayExtraction() {
        NodeId typeId = new NodeId(3, "UDT_Motor");
        ByteString bs = ByteString.of(new byte[]{0x01, 0x02, 0x03});
        ExtensionObject xo1 = new ExtensionObject(bs, typeId);
        ExtensionObject xo2 = new ExtensionObject(bs, typeId);

        ExtensionObject[] arr = new ExtensionObject[]{xo1, xo2};
        Object val = OpcUaValueHelper.sanitizeAndExtractValue(arr);

        assertThat(val).isInstanceOf(List.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) val;
        assertThat(list).hasSize(2);
        Map<String, Object> m = list.get(0);
        assertThat(m).containsEntry("_type", "UDT");
        assertThat(m).containsEntry("typeId", "ns=3;s=UDT_Motor");
        assertThat(m).containsEntry("hex", "010203");
    }
}
