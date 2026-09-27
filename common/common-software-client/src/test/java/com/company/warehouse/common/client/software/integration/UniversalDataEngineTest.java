package com.company.warehouse.common.client.software.integration;

import com.company.warehouse.common.client.software.integration.mapping.DynamicMappingEngine;
import com.company.warehouse.common.client.software.integration.mapping.FieldMappingRule;
import com.company.warehouse.common.client.software.integration.parser.AutoDetectingDataParser;
import com.company.warehouse.common.client.software.integration.parser.JsonDataEngine;
import com.company.warehouse.common.client.software.integration.parser.XmlDataEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class UniversalDataEngineTest {

    private XmlDataEngine xmlDataEngine;
    private JsonDataEngine jsonDataEngine;
    private AutoDetectingDataParser autoParser;
    private DynamicMappingEngine mappingEngine;

    @BeforeEach
    void setUp() {
        xmlDataEngine = new XmlDataEngine();
        jsonDataEngine = new JsonDataEngine(new ObjectMapper());
        autoParser = new AutoDetectingDataParser(xmlDataEngine, jsonDataEngine);
        mappingEngine = new DynamicMappingEngine(autoParser);
    }

    @Test
    void testXmlParsingAndXPathExtraction() {
        String xml = """
                <IDOC BEGIN="1">
                    <EDI_DC40>
                        <DOCNUM>0000000098765432</DOCNUM>
                        <MESTYP>WMTORD</MESTYP>
                    </EDI_DC40>
                    <E1WMTOD>
                        <LENUM>PLT-SAP-987</LENUM>
                        <MATNR>SKU-BEV-001</MATNR>
                        <MENGE>45.5</MENGE>
                        <NLPLA>RACK-B-05-02</NLPLA>
                    </E1WMTOD>
                </IDOC>
                """;

        assertEquals(AutoDetectingDataParser.DataFormat.XML, autoParser.detectFormat(xml));
        assertEquals("0000000098765432", autoParser.extractValue(xml, "//DOCNUM"));
        assertEquals("PLT-SAP-987", autoParser.extractValue(xml, "//LENUM"));
        assertEquals("SKU-BEV-001", autoParser.extractValue(xml, "//MATNR"));
        assertEquals("45.5", autoParser.extractValue(xml, "//MENGE"));

        Map<String, Object> map = autoParser.parseToMap(xml);
        assertNotNull(map);
        assertTrue(map.containsKey("IDOC"));
    }

    @Test
    void testJsonParsingAndPathExtraction() {
        String json = """
                {
                    "idocNumber": "DOC-JSON-100",
                    "pallet": {
                        "lpn": "PLT-JSON-42",
                        "weightKg": 820.5
                    },
                    "items": [
                        {"sku": "SKU-BEV-001", "qty": 10},
                        {"sku": "SKU-SNACK-002", "qty": 20}
                    ]
                }
                """;

        assertEquals(AutoDetectingDataParser.DataFormat.JSON, autoParser.detectFormat(json));
        assertEquals("DOC-JSON-100", autoParser.extractValue(json, "$.idocNumber"));
        assertEquals("PLT-JSON-42", autoParser.extractValue(json, "pallet.lpn"));
        assertEquals(820.5, autoParser.extractValue(json, "pallet.weightKg"));
        assertEquals("SKU-BEV-001", autoParser.extractValue(json, "items[0].sku"));
        assertEquals(20, autoParser.extractValue(json, "items[1].qty"));
    }

    @Test
    void testDynamicFieldMappingEngine() {
        String xml = """
                <DOCUMENT>
                    <HEADER>
                        <CODE>PO-9921</CODE>
                    </HEADER>
                    <PAYLOAD>
                        <HU_NUMBER>PLT-MAPPED-77</HU_NUMBER>
                        <GROSS_WEIGHT>650.25</GROSS_WEIGHT>
                    </PAYLOAD>
                </DOCUMENT>
                """;

        List<FieldMappingRule> rules = List.of(
                FieldMappingRule.builder().sourcePath("//HU_NUMBER | $.palletLpn").targetField("palletLpn").required(true).build(),
                FieldMappingRule.builder().sourcePath("//CODE | $.orderId").targetField("orderId").build(),
                FieldMappingRule.builder().sourcePath("//GROSS_WEIGHT").targetField("weightKg").dataType("NUMBER").build(),
                FieldMappingRule.builder().sourcePath("//MISSING_TAG").targetField("status").defaultValue("PENDING").build()
        );

        Map<String, Object> canonical = mappingEngine.mapToCanonical(xml, rules);

        assertEquals("PLT-MAPPED-77", canonical.get("palletLpn"));
        assertEquals("PO-9921", canonical.get("orderId"));
        assertEquals(650.25, canonical.get("weightKg"));
        assertEquals("PENDING", canonical.get("status"));
    }
}
