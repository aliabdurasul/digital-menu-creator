import { headers } from "next/headers";

/** Well-known header names injected by middleware during domain rewrite */
export const TENANT_HEADERS = {
  id: "x-tenant-id",
  slug: "x-tenant-slug",
  domain: "x-tenant-domain",
} as const;

export interface TenantContext {
  /** Restaurant UUID */
  id: string;
  /** Restaurant slug */
  slug: string;
  /** The custom domain used in the request */
  domain: string;
}

/**
 * Read tenant info from request headers (server components only).
 * Returns `null` when the request was NOT rewritten through domain resolution.
 */
export async function getTenantFromHeaders(): Promise<TenantContext | null> {
  const h = await headers();
  const id = h.get(TENANT_HEADERS.id);
  const slug = h.get(TENANT_HEADERS.slug);
  const domain = h.get(TENANT_HEADERS.domain);

  if (!id || !slug) return null;

  return { id, slug, domain: domain ?? "" };
}
