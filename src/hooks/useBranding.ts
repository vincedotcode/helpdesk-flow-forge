
import { brandingConfig, BrandingConfig } from '@/config/branding';

export const useBranding = (): BrandingConfig => {
  return brandingConfig;
};

// Helper functions for common branding needs
export const getBrandingTitle = (pageTitle?: string): string => {
  if (pageTitle) {
    return `${pageTitle} - ${brandingConfig.companyName}`;
  }
  return `${brandingConfig.companyName} - ${brandingConfig.tagline}`;
};

export const getBrandedUrl = (path: string = ''): string => {
  return `https://${brandingConfig.domain}${path}`;
};

export const getBrandingDescription = (): string => {
  return brandingConfig.description;
};
