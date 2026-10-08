import { DeviceTag } from './types';

export interface UdtMemberRow {
  key: string;
  name: string;
  nodeId: string;
  memberPath: string;
  dataType: string;
  value: unknown;
  writable: boolean;
}

/**
 * Checks if a value is a complex UDT structure (object, array, or JSON string of either).
 */
export const isComplexValue = (val: unknown): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'object' && parsed !== null;
      } catch {
        return false;
      }
    }
    return false;
  }
  return typeof val === 'object';
};

/**
 * Parses and returns the direct child tags for a given tag.
 * Priority 1: dbChildren explicitly provided from DB or browse hierarchy.
 * Priority 2: Direct 1-level children extracted from tag.value (objects or arrays).
 */
export const extractDirectChildren = (tag: DeviceTag, dbChildren: DeviceTag[] = []): DeviceTag[] => {
  if (dbChildren.length > 0) {
    return dbChildren;
  }

  let val = tag.value;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('[object Object]')) {
      return [];
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        val = JSON.parse(trimmed);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!val || typeof val !== 'object') {
    return [];
  }

  const result: DeviceTag[] = [];

  if (Array.isArray(val)) {
    val.forEach((item, idx) => {
      const isItemComplex = isComplexValue(item);
      const childName = `[${idx}]`;
      const fullPath = `${tag.name}[${idx}]`;
      const childNodeId = tag.nodeId.includes('#')
        ? `${tag.nodeId}[${idx}]`
        : `${tag.nodeId}#[${idx}]`;

      let dt: DeviceTag['dataType'] = 'Variant';
      if (isItemComplex) {
        dt = Array.isArray(item) ? `Array[${item.length}]` : 'UDT / Struct';
      } else if (typeof item === 'boolean') {
        dt = 'Boolean';
      } else if (typeof item === 'number') {
        dt = Number.isInteger(item) ? 'Int32' : 'Float';
      } else if (typeof item === 'string') {
        dt = 'String';
      }

      result.push({
        id: childNodeId,
        name: fullPath,
        nodeId: childNodeId,
        folder: tag.folder,
        dataType: dt,
        quality: tag.quality ?? 'GOOD (0x00000000)',
        value: item,
        timestamp: tag.timestamp,
        subscribed: tag.subscribed ?? true,
        writable: !isItemComplex,
        isUdt: isItemComplex,
        isUdtMember: true,
        parentTagId: tag.id || tag.nodeId,
        memberPath: childName,
        acquisitionMethod: tag.acquisitionMethod,
        isMonitored: tag.isMonitored
      });
    });
  } else {
    const rec = val as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      if (k.startsWith('_')) continue;
      if (k === 'typeId' && typeof v === 'string') continue;

      const isFieldComplex = isComplexValue(v);
      const fullPath = `${tag.name}.${k}`;
      const childNodeId = tag.nodeId.includes('#')
        ? `${tag.nodeId}.${k}`
        : `${tag.nodeId}#${k}`;

      let dt: DeviceTag['dataType'] = 'Variant';
      if (isFieldComplex) {
        dt = Array.isArray(v) ? `Array[${(v as unknown[]).length}]` : 'UDT / Struct';
      } else if (typeof v === 'boolean') {
        dt = 'Boolean';
      } else if (typeof v === 'number') {
        dt = Number.isInteger(v) ? 'Int32' : 'Float';
      } else if (typeof v === 'string') {
        dt = 'String';
      }

      result.push({
        id: childNodeId,
        name: fullPath,
        nodeId: childNodeId,
        folder: tag.folder,
        dataType: dt,
        quality: tag.quality ?? 'GOOD (0x00000000)',
        value: v,
        timestamp: tag.timestamp,
        subscribed: tag.subscribed ?? true,
        writable: !isFieldComplex,
        isUdt: isFieldComplex,
        isUdtMember: true,
        parentTagId: tag.id || tag.nodeId,
        memberPath: k,
        acquisitionMethod: tag.acquisitionMethod,
        isMonitored: tag.isMonitored
      });
    }
  }

  return result;
};

/**
 * Parses and extracts child fields from a composite UDT tag value.
 * Handles JSON objects, arrays of objects, and Milo decoded structure maps.
 * Rejects corrupt / invalid values safely.
 */
export const extractUdtMembers = (tag: DeviceTag): UdtMemberRow[] => {
  let val = tag.value;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('[object Object]')) {
      return [];
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        val = JSON.parse(trimmed);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!val || typeof val !== 'object') {
    return [];
  }

  const members: UdtMemberRow[] = [];

  const flatten = (obj: unknown, prefix = '') => {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        flatten(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`);
      });
    } else if (typeof obj === 'object') {
      const rec = obj as Record<string, unknown>;
      for (const [k, v] of Object.entries(rec)) {
        if (k.startsWith('_')) continue;
        if (k === 'typeId' && typeof v === 'string') continue;
        const currentPath = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object') {
          flatten(v, currentPath);
        } else {
          const typeStr = typeof v === 'boolean' ? 'Boolean'
            : typeof v === 'number' ? (Number.isInteger(v) ? 'Int32' : 'Float')
            : 'String';

          const memberNodeId = tag.nodeId.includes('#')
            ? `${tag.nodeId}.${currentPath}`
            : `${tag.nodeId}#${currentPath}`;

          members.push({
            key: currentPath,
            name: currentPath,
            nodeId: memberNodeId,
            memberPath: currentPath,
            dataType: typeStr,
            value: v,
            writable: tag.writable ?? true
          });
        }
      }
    }
  };

  flatten(val);
  return members;
};

/**
 * Expands all tags (including UDT members) into a flat list of individual tags
 * for Rule configuration at tag level instead of UDT level.
 */
export const flattenTagsForRules = (tags: DeviceTag[]): DeviceTag[] => {
  const result: DeviceTag[] = [];

  for (const tag of tags) {
    const members = extractUdtMembers(tag);
    if (members.length > 0) {
      for (const m of members) {
        result.push({
          id: m.nodeId,
          name: `${tag.name}.${m.name}`,
          nodeId: m.nodeId,
          folder: tag.folder,
          dataType: m.dataType as DeviceTag['dataType'],
          quality: tag.quality ?? 'GOOD (0x00000000)',
          value: m.value,
          timestamp: tag.timestamp,
          subscribed: tag.subscribed ?? true,
          writable: m.writable,
          isMonitored: true,
          isUdtMember: true,
          parentTagId: tag.id
        });
      }
    } else {
      result.push(tag);
    }
  }

  return result;
};
