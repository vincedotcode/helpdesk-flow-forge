
import { brandingConfig } from '@/config/branding';

// Convert hex to HSL for CSS custom properties
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyBrandingTheme(): void {
  const root = document.documentElement;
  const { theme } = brandingConfig;

  // Apply main theme colors
  root.style.setProperty('--primary', hexToHsl(theme.primary));
  root.style.setProperty('--secondary', hexToHsl(theme.secondary));
  root.style.setProperty('--accent', hexToHsl(theme.accent));
  root.style.setProperty('--background', hexToHsl(theme.background));
  root.style.setProperty('--foreground', hexToHsl(theme.foreground));
  root.style.setProperty('--muted', hexToHsl(theme.muted));
  root.style.setProperty('--destructive', hexToHsl(theme.destructive));
  root.style.setProperty('--border', hexToHsl(theme.border));

  // Apply sidebar colors
  root.style.setProperty('--sidebar-background', hexToHsl(theme.sidebar.background));
  root.style.setProperty('--sidebar-foreground', hexToHsl(theme.sidebar.foreground));
  root.style.setProperty('--sidebar-primary', hexToHsl(theme.sidebar.primary));
  root.style.setProperty('--sidebar-accent', hexToHsl(theme.sidebar.accent));
  root.style.setProperty('--sidebar-border', hexToHsl(theme.sidebar.border));

  // Apply additional computed colors
  root.style.setProperty('--primary-foreground', theme.background === '#ffffff' ? '210 40% 98%' : '222.2 84% 4.9%');
  root.style.setProperty('--secondary-foreground', hexToHsl(theme.foreground));
  root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
  root.style.setProperty('--accent-foreground', hexToHsl(theme.foreground));
  root.style.setProperty('--destructive-foreground', '210 40% 98%');
  root.style.setProperty('--input', hexToHsl(theme.border));
  root.style.setProperty('--ring', hexToHsl(theme.foreground));
  root.style.setProperty('--sidebar-primary-foreground', hexToHsl(theme.background));
  root.style.setProperty('--sidebar-accent-foreground', hexToHsl(theme.sidebar.foreground));
  root.style.setProperty('--sidebar-ring', hexToHsl(theme.accent));

  // Apply card colors
  root.style.setProperty('--card', hexToHsl(theme.background));
  root.style.setProperty('--card-foreground', hexToHsl(theme.foreground));
  root.style.setProperty('--popover', hexToHsl(theme.background));
  root.style.setProperty('--popover-foreground', hexToHsl(theme.foreground));
}
