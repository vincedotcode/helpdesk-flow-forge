
export interface BrandingConfig {
  // Company/Product Identity
  companyName: string;
  productName: string;
  tagline: string;
  description: string;
  
  // URLs and Domains
  website: string;
  supportEmail: string;
  domain: string;
  
  // SEO and Meta
  keywords: string[];
  author: string;
  
  // Demo Credentials (for landing page)
  demoAdmin: {
    email: string;
    password: string;
  };
  
  // Features/Benefits (for landing page)
  features: string[];
  
  // Colors and Styling
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    destructive: string;
    border: string;
    sidebar: {
      background: string;
      foreground: string;
      primary: string;
      accent: string;
      border: string;
    };
  };
  
  // Social Media
  social: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

// Default configuration - easily customizable for each client
export const brandingConfig: BrandingConfig = {
  companyName: "HelpDesk Flow Forge",
  productName: "Helpdesk Pro",
  tagline: "Professional IT Support Management",
  description: "Comprehensive helpdesk management system with ticket tracking, knowledge base, user management, and analytics. Streamline your IT support operations with advanced workflow automation.",
  
  website: "https://helpdesk-flow-forge.lovable.app/",
  supportEmail: "support@helpdesk-flow-forge.com",
  domain: "helpdesk-flow-forge.lovable.app",
  
  keywords: [
    "helpdesk",
    "IT support", 
    "ticket management",
    "knowledge base",
    "user management",
    "analytics",
    "workflow automation"
  ],
  author: "HelpDesk Flow Forge",
  
  demoAdmin: {
    email: "admin@helpdesk.com",
    password: "admin123"
  },
  
  features: [
    "Multi-role user management",
    "Department-based organization", 
    "Advanced ticket tracking",
    "Real-time collaboration"
  ],
  
  theme: {
    primary: "#2563eb",
    secondary: "#64748b", 
    accent: "#06b6d4",
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
    destructive: "#dc2626",
    border: "#e2e8f0",
    sidebar: {
      background: "#f8fafc",
      foreground: "#334155",
      primary: "#1e293b",
      accent: "#f1f5f9",
      border: "#e2e8f0"
    }
  },
  
  social: {
    twitter: "https://twitter.com/helpdeskpro",
    linkedin: "https://linkedin.com/company/helpdeskpro"
  }
};
