
# White Label Configuration Guide

This helpdesk platform is designed to be easily white-labeled for different clients. All branding and identity information is centralized in a single configuration file.

## Quick Setup

1. **Edit the branding configuration**:
   - Open `src/config/branding.ts`
   - Update all the values to match your client's branding

2. **Update assets**:
   - Replace `public/favicon.ico` with client's favicon
   - Replace `public/apple-touch-icon.png` with client's icon
   - Replace `public/og-image.png` with client's social media image

3. **Update domain references**:
   - Update `public/robots.txt` with the new domain
   - Update `public/sitemap.xml` with the new domain

## Configuration Options

### Company Identity
- `companyName`: The main company/product name
- `productName`: The product name shown in the sidebar
- `tagline`: Marketing tagline
- `description`: SEO description and marketing copy

### Contact & URLs
- `website`: Main website URL
- `supportEmail`: Support contact email
- `domain`: The domain where the app is hosted

### Demo Credentials
- `demoAdmin`: Credentials shown on the landing page

### Features & Benefits
- `features`: Array of key features for the landing page

### Styling
- `theme`: Primary, secondary, and accent colors
- Colors should be in hex format (#rrggbb)

### Social Media
- `social`: Optional social media links

## Files That Use Branding

- `src/pages/Index.tsx` - Landing page content
- `src/components/AppSidebar.tsx` - Product name in sidebar
- `index.html` - SEO meta tags and page title
- `public/sitemap.xml` - Domain references
- `public/robots.txt` - Domain references

## CSS Customization

To further customize the appearance:

1. Update the theme colors in `src/config/branding.ts`
2. The colors are automatically applied to meta tags for browser theming
3. For deeper customization, modify the Tailwind configuration

## Deployment Checklist

Before deploying for a client:

- [ ] Update all branding configuration values
- [ ] Replace favicon and icons
- [ ] Update domain in robots.txt and sitemap.xml
- [ ] Test all functionality
- [ ] Verify SEO tags are correct
- [ ] Check social media previews

## Support

For technical support with white-labeling, contact the development team.
