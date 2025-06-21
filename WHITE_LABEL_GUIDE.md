
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

### Theme Colors
The theme object contains all the colors used throughout the application:

#### Main Colors
- `primary`: Primary brand color (buttons, links, highlights)
- `secondary`: Secondary color for less prominent elements
- `accent`: Accent color for special highlights
- `background`: Main background color
- `foreground`: Main text color
- `muted`: Muted backgrounds and subtle elements
- `destructive`: Error/danger color
- `border`: Border color for inputs and separators

#### Sidebar Colors
- `sidebar.background`: Sidebar background color
- `sidebar.foreground`: Sidebar text color
- `sidebar.primary`: Sidebar primary elements
- `sidebar.accent`: Sidebar accent elements
- `sidebar.border`: Sidebar borders

**Color Format**: All colors should be in hex format (#rrggbb). The system automatically converts them to HSL for CSS custom properties.

### Social Media
- `social`: Optional social media links

## Files That Use Branding

- `src/pages/Index.tsx` - Landing page content
- `src/components/AppSidebar.tsx` - Product name in sidebar
- `index.html` - SEO meta tags and page title
- `public/sitemap.xml` - Domain references
- `public/robots.txt` - Domain references

## Theme Customization

The theme system automatically applies your brand colors throughout the application:

1. **Light/Dark Mode**: The system supports both light and dark themes
2. **Dynamic Colors**: All UI components automatically use your brand colors
3. **Sidebar Theming**: Sidebar has its own color scheme for better contrast
4. **Accessibility**: Colors are automatically adjusted for proper contrast ratios

### Color Selection Tips

- Choose colors with sufficient contrast for accessibility
- Test both light and dark modes
- Ensure your primary color works well with white and dark backgrounds
- Consider your brand's existing color palette

## CSS Customization

For advanced customization beyond colors:

1. The theme colors are applied via CSS custom properties
2. You can override specific styles in `src/index.css`
3. All components use Tailwind CSS classes that respect the theme

## Deployment Checklist

Before deploying for a client:

- [ ] Update all branding configuration values
- [ ] Replace favicon and icons
- [ ] Update domain in robots.txt and sitemap.xml
- [ ] Test all theme colors in light and dark mode
- [ ] Verify color contrast for accessibility
- [ ] Test all functionality
- [ ] Verify SEO tags are correct
- [ ] Check social media previews

## Support

For technical support with white-labeling, contact the development team.
