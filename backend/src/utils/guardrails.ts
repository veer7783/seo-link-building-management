import { PrismaClient, Project, Site, AnchorType } from '@prisma/client';

const prisma = new PrismaClient();

interface GuardrailValidation {
  isValid: boolean;
  error?: string;
}

export const validateProjectGuardrails = async (
  project: Project,
  sites: Site[],
  anchorType: AnchorType
): Promise<GuardrailValidation> => {
  
  // Simplified guardrails for basic project model
  // TODO: Implement advanced guardrails if needed in the future
  
  // Basic validation - ensure sites exist
  if (sites.length === 0) {
    return {
      isValid: false,
      error: 'At least one site must be selected for the order',
    };
  }

  // Check for duplicate domains in existing orders
  const existingOrders = await prisma.order.findMany({
    where: {
      projectId: project.id,
      status: { not: 'CANCELLED' },
    },
    include: {
      orderSites: {
        include: {
          site: true,
        },
      },
    },
  });

  const existingDomains = existingOrders.flatMap(order => 
    order.orderSites.map(os => os.site.domain)
  );

  const duplicateSites = sites.filter(site => existingDomains.includes(site.domain));
  if (duplicateSites.length > 0) {
    return {
      isValid: false,
      error: `Sites ${duplicateSites.map(s => s.domain).join(', ')} already have active orders in this project`,
    };
  }

  return { isValid: true };
};

// Helper functions removed for simplified project model
// TODO: Re-implement if advanced guardrails are needed

export const checkBudgetStatus = (budgetUsed: number, budgetCap: number): {
  status: 'OK' | 'WARNING' | 'EXCEEDED';
  percentage: number;
  warning?: string;
} => {
  const percentage = (budgetUsed / budgetCap) * 100;
  
  if (percentage >= 100) {
    return {
      status: 'EXCEEDED',
      percentage,
      warning: 'Budget has been exceeded',
    };
  } else if (percentage >= 80) {
    return {
      status: 'WARNING',
      percentage,
      warning: 'Budget is 80% utilized',
    };
  }
  
  return {
    status: 'OK',
    percentage,
  };
};
