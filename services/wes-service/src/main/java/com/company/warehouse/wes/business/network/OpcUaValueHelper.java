package com.company.warehouse.wes.business.network;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.milo.opcua.stack.core.types.builtin.*;

import java.lang.reflect.Array;
import java.util.*;

/**
 * Industrial OPC UA / IEC 62541 Variant & UDT value normalization helper.
 * Unpacks Milo ExtensionObjects, LocalizedTexts, ByteStrings, and arrays
 * into clean Java Maps, Lists, and primitives for JSON serialization.
 */
@Slf4j
public final class OpcUaValueHelper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private OpcUaValueHelper() {}

    /**
     * Recursively sanitizes and normalizes an OPC UA value from Eclipse Milo into
     * human-readable and JSON-serializable structures.
     */
    public static Object sanitizeAndExtractValue(Object raw) {
        if (raw == null) {
            return null;
        }

        if (raw instanceof LocalizedText lt) {
            return lt.getText() != null ? lt.getText() : "";
        }

        if (raw instanceof QualifiedName qn) {
            return qn.getName();
        }

        if (raw instanceof NodeId nid) {
            return nid.toParseableString();
        }

        if (raw instanceof ExpandedNodeId enid) {
            return enid.toParseableString();
        }

        if (raw instanceof ByteString bs) {
            return bytesToHex(bs.bytesOrEmpty());
        }

        if (raw instanceof ExtensionObject xo) {
            return extractExtensionObject(xo);
        }

        if (raw instanceof ExtensionObject[] xoArr) {
            List<Object> list = new ArrayList<>(xoArr.length);
            for (ExtensionObject xo : xoArr) {
                list.add(extractExtensionObject(xo));
            }
            return list;
        }

        if (raw instanceof Object[] arr) {
            List<Object> list = new ArrayList<>(arr.length);
            for (Object item : arr) {
                list.add(sanitizeAndExtractValue(item));
            }
            return list;
        }

        // Handle primitive arrays (e.g., int[], double[], byte[], boolean[])
        if (raw.getClass().isArray()) {
            int length = Array.getLength(raw);
            List<Object> list = new ArrayList<>(length);
            for (int i = 0; i < length; i++) {
                list.add(sanitizeAndExtractValue(Array.get(raw, i)));
            }
            return list;
        }

        if (raw instanceof Collection<?> coll) {
            List<Object> list = new ArrayList<>(coll.size());
            for (Object item : coll) {
                list.add(sanitizeAndExtractValue(item));
            }
            return list;
        }

        if (raw instanceof Map<?, ?> map) {
            Map<String, Object> cleanMap = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                cleanMap.put(String.valueOf(entry.getKey()), sanitizeAndExtractValue(entry.getValue()));
            }
            return cleanMap;
        }

        return raw;
    }

    private static Object extractExtensionObject(ExtensionObject xo) {
        if (xo == null) return null;

        Object body = xo.getBody();
        String typeIdStr = xo.getEncodingId() != null ? xo.getEncodingId().toParseableString() : "Structure";

        if (body == null) {
            return Map.of("_type", "UDT", "typeId", typeIdStr);
        }

        if (body instanceof ByteString bs) {
            byte[] bytes = bs.bytesOrEmpty();
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("_type", "UDT");
            map.put("typeId", typeIdStr);
            map.put("hex", bytesToHex(bytes));
            map.put("byteLength", bytes.length);
            return map;
        }

        if (body instanceof String || body instanceof Number || body instanceof Boolean) {
            return body;
        }

        try {
            // Attempt to convert Milo decoded structure bean to Map
            @SuppressWarnings("unchecked")
            Map<String, Object> beanMap = OBJECT_MAPPER.convertValue(body, Map.class);
            if (beanMap != null && !beanMap.isEmpty()) {
                Map<String, Object> cleanMap = new LinkedHashMap<>();
                for (Map.Entry<String, Object> entry : beanMap.entrySet()) {
                    cleanMap.put(entry.getKey(), sanitizeAndExtractValue(entry.getValue()));
                }
                return cleanMap;
            }
        } catch (Exception ex) {
            log.debug("Could not reflect structure fields for {}: {}", typeIdStr, ex.getMessage());
        }

        return sanitizeAndExtractValue(body);
    }

    private static String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return "";
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
