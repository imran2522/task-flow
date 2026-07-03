import dns from 'dns';

/** Use public DNS when Node only sees a local resolver that rejects SRV lookups. */
export function configureDns() {
  const fromEnv = process.env.DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (fromEnv?.length) {
    dns.setServers(fromEnv);
    return;
  }

  const current = dns.getServers();
  const localOnly = current.length === 0
    || current.every((s) => s.startsWith('127.') || s.startsWith('fe80:') || s === '::1');
  if (localOnly) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
}
