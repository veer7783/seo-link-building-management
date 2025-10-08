import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SitePricing {
  siteId: string;
  basePrice: number;
  clientPrice: number;
  hasOverride: boolean;
  overridePrice?: number;
}

/**
 * Calculate the displayed price for a site for a specific client
 * Formula: displayed_price = base_price + (base_price * client.percentage / 100)
 * Unless there's a manual override for this client-site combination
 */
export const calculateSitePrice = (basePrice: number, clientPercentage: number, overridePrice?: number): number => {
  if (overridePrice !== undefined) {
    return overridePrice;
  }
  
  return basePrice + (basePrice * clientPercentage / 100);
};

/**
 * Get pricing for all sites for a specific client
 */
export const getSitePricingForClient = async (clientId: string): Promise<SitePricing[]> => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { percentage: true },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const sites = await prisma.site.findMany({
    where: { isActive: true },
    include: {
      clientSiteOverrides: {
        where: { clientId },
      },
    },
  });

  return sites.map(site => {
    const override = site.clientSiteOverrides[0];
    const basePrice = Number(site.basePrice);
    const clientPrice = calculateSitePrice(basePrice, client.percentage, override?.overridePrice ? Number(override.overridePrice) : undefined);

    return {
      siteId: site.id,
      basePrice,
      clientPrice,
      hasOverride: !!override,
      overridePrice: override ? Number(override.overridePrice) : undefined,
    };
  });
};

/**
 * Get pricing for a specific site for a specific client
 */
export const getSitePricingForClientSite = async (clientId: string, siteId: string): Promise<SitePricing> => {
  const [client, site] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { percentage: true },
    }),
    prisma.site.findUnique({
      where: { id: siteId },
      include: {
        clientSiteOverrides: {
          where: { clientId },
        },
      },
    }),
  ]);

  if (!client) {
    throw new Error('Client not found');
  }

  if (!site) {
    throw new Error('Site not found');
  }

  const override = site.clientSiteOverrides[0];
  const basePrice = Number(site.basePrice);
  const clientPrice = calculateSitePrice(basePrice, client.percentage, override?.overridePrice ? Number(override.overridePrice) : undefined);

  return {
    siteId: site.id,
    basePrice,
    clientPrice,
    hasOverride: !!override,
    overridePrice: override ? Number(override.overridePrice) : undefined,
  };
};

/**
 * Update base price for a site (affects all clients unless they have overrides)
 */
export const updateSiteBasePrice = async (siteId: string, newBasePrice: number): Promise<void> => {
  await prisma.site.update({
    where: { id: siteId },
    data: { basePrice: newBasePrice },
  });
};

/**
 * Set or update a price override for a specific client-site combination
 */
export const setSitePriceOverride = async (
  clientId: string, 
  siteId: string, 
  overridePrice: number, 
  createdById: string
): Promise<void> => {
  await prisma.clientSiteOverride.upsert({
    where: {
      clientId_siteId: {
        clientId,
        siteId,
      },
    },
    update: {
      overridePrice,
    },
    create: {
      clientId,
      siteId,
      overridePrice,
      createdById,
    },
  });
};

/**
 * Remove a price override for a specific client-site combination
 */
export const removeSitePriceOverride = async (clientId: string, siteId: string): Promise<void> => {
  await prisma.clientSiteOverride.deleteMany({
    where: {
      clientId,
      siteId,
    },
  });
};
