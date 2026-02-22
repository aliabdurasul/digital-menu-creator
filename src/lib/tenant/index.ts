/**
 * Tenant module — public API.
 */
export { resolveDomain } from "./domain-resolver";
export {
  getTenantBySlug,
  getTenantBySubdomain,
  getTenantByDomain,
  getTenantFromHeaders,
} from "./tenant-context";
export { TENANT_HEADERS } from "./types";
export type {
  DomainResolution,
  TenantContext,
  TenantResolvedVia,
} from "./types";
