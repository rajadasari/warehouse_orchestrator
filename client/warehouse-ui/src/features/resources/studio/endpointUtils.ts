/**
 * Utility for normalizing resource host, port, protocol into a valid synthetic endpoint.
 * Prevents duplicate scheme prefixes such as "rest://http://10.21.38.206:5000".
 */
export function computeSyntheticEndpoint(
  host: string,
  port?: number | '',
  protocol?: string
): string {
  if (!host || !host.trim()) return 'No host configured yet';
  const cleanedHost = host.trim();
  const proto = (protocol || 'http').trim().toLowerCase();

  // If host already contains a scheme (e.g. http://, https://, grpc://, ws://, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleanedHost)) {
    if (port && !cleanedHost.split('://')[1]?.includes(':')) {
      return `${cleanedHost}:${port}`;
    }
    return cleanedHost;
  }

  let scheme = 'http://';
  if (proto === 'grpc') {
    scheme = 'grpc://';
  } else if (proto === 'https') {
    scheme = 'https://';
  } else if (proto === 'tcp' || proto === 'tcp_socket') {
    scheme = 'tcp://';
  } else if (proto === 'plc_s7' || proto === 's7') {
    scheme = 's7://';
  } else if (proto === 'rest' || proto.startsWith('http')) {
    scheme = 'http://';
  } else {
    scheme = `${proto}://`;
  }

  const portSuffix = port && !cleanedHost.includes(':') ? `:${port}` : '';
  return `${scheme}${cleanedHost}${portSuffix}`;
}

export function extractConnectionCoordinates(
  props: Record<string, unknown>,
  template?: {
    communicationProtocol?: string;
    defaultProtocol?: string;
    defaultHost?: string;
    defaultPort?: number;
  } | null
): { host: string; port?: number; protocol: string } {
  const hostVal =
    props['ipAddress'] ??
    props['ip'] ??
    props['host'] ??
    props['plcIp'] ??
    props['targetHost'] ??
    props['baseUrl'] ??
    template?.defaultHost ??
    '';
  const host = String(hostVal).trim();

  const portVal =
    props['port'] ??
    props['targetPort'] ??
    props['plcPort'] ??
    template?.defaultPort;
  const port =
    portVal !== undefined && portVal !== '' ? Number(portVal) : undefined;

  const protoVal =
    props['protocol'] ??
    props['communicationProtocol'] ??
    template?.communicationProtocol ??
    template?.defaultProtocol ??
    'http';
  const protocol = String(protoVal).trim();

  return { host, port, protocol };
}

