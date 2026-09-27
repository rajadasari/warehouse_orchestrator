package com.company.warehouse.common.client.software.integration.parser;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Universal XML Parsing & Evaluation Engine.
 * Hardened with IEC 62443 / OWASP XXE Injection prevention.
 */
@Slf4j
@Component
public class XmlDataEngine implements UniversalDataParser {

    @Override
    public boolean supportsFormat(String format) {
        return "XML".equalsIgnoreCase(format) || "APPLICATION/XML".equalsIgnoreCase(format) || "TEXT/XML".equalsIgnoreCase(format);
    }

    @Override
    public Map<String, Object> parseToMap(String rawPayload) {
        if (rawPayload == null || rawPayload.trim().isEmpty()) {
            return Map.of();
        }
        try {
            Document doc = parseDocument(rawPayload);
            Map<String, Object> result = new LinkedHashMap<>();
            Node root = doc.getDocumentElement();
            result.put(root.getNodeName(), nodeToMap(root));
            return result;
        } catch (Exception e) {
            log.error("Failed to parse XML to Map: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid XML payload: " + e.getMessage(), e);
        }
    }

    @Override
    public Object extractValue(String rawPayload, String xpathExpression) {
        if (rawPayload == null || xpathExpression == null || xpathExpression.trim().isEmpty()) {
            return null;
        }
        try {
            Document doc = parseDocument(rawPayload);
            XPath xpath = XPathFactory.newInstance().newXPath();
            String expr = xpathExpression.trim();

            NodeList nodes = (NodeList) xpath.evaluate(expr, doc, XPathConstants.NODESET);
            if (nodes != null && nodes.getLength() > 0) {
                if (nodes.getLength() == 1) {
                    return nodes.item(0).getTextContent().trim();
                }
                List<String> values = new ArrayList<>();
                for (int i = 0; i < nodes.getLength(); i++) {
                    values.add(nodes.item(i).getTextContent().trim());
                }
                return values;
            }

            // Fallback to string evaluation
            String strVal = xpath.evaluate(expr, doc);
            return (strVal != null && !strVal.isBlank()) ? strVal.trim() : null;
        } catch (Exception e) {
            log.debug("XPath evaluation '{}' produced no match: {}", xpathExpression, e.getMessage());
            return null;
        }
    }

    /**
     * Parses an XML string into a DOM Document with strict XXE protection.
     */
    public Document parseDocument(String xml) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
        dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        dbf.setXIncludeAware(false);
        dbf.setExpandEntityReferences(false);
        dbf.setNamespaceAware(false);

        DocumentBuilder builder = dbf.newDocumentBuilder();
        Document doc = builder.parse(new InputSource(new StringReader(xml.trim())));
        doc.getDocumentElement().normalize();
        return doc;
    }

    private Object nodeToMap(Node node) {
        NodeList children = node.getChildNodes();
        if (children == null || children.getLength() == 0) {
            return node.getTextContent() != null ? node.getTextContent().trim() : "";
        }

        Map<String, Object> map = new LinkedHashMap<>();
        boolean hasElementChildren = false;

        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                hasElementChildren = true;
                String childName = child.getNodeName();
                Object childValue = nodeToMap(child);

                if (map.containsKey(childName)) {
                    Object existing = map.get(childName);
                    if (existing instanceof List) {
                        @SuppressWarnings("unchecked")
                        List<Object> existingList = (List<Object>) existing;
                        existingList.add(childValue);
                    } else {
                        List<Object> list = new ArrayList<>();
                        list.add(existing);
                        list.add(childValue);
                        map.put(childName, list);
                    }
                } else {
                    map.put(childName, childValue);
                }
            }
        }

        if (!hasElementChildren) {
            return node.getTextContent() != null ? node.getTextContent().trim() : "";
        }
        return map;
    }
}
