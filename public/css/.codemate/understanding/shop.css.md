This CSS file styles a "Shop" page with a visual design that mimics product detail pages (PDP) glass effects and layered depth, using existing site classes. It defines color tokens, layout, and interactive elements with emphasis on translucency, blur effects, and smooth color gradients to create a polished, modern interface that matches the site’s branding.  

Key sections and features:

1. **CSS Variables (Tokens)**  
   Defines reusable color, shadow, border, radius, and accent variables for consistent theming:
   - Glassy "plates" and card backgrounds with varying opacities.  
   - Shadows to simulate depth.  
   - Text and link colors.  
   - Accent colors ("sun" orange and "sky" blue) and their soft translucent variants, enhanced with `color-mix` where supported.

2. **Page Surface and Background Effects**  
   - `.shop-page` and `.shop-surface` containers set up relative positioning and layering.  
   - `.shop-surface::before` adds a fixed full-viewport background with warm and cool translucent radial gradients ("sun" and "sky" blooms) and subtle side fades, behind all content, plus a slight blur for softness.  
   - `.shop-surface::after` overlays under the fixed navigation bar to maintain continuous glass effect with a warm gradient and blur.

3. **Header Styling (.shop-head, .head-card)**  
   - The header area includes a fixed top margin to clear the navbar and layered translucent card with blurred background and soft shadows.  
   - The `.head-card` uses pseudo-elements to add top and bottom "rails" with vertical gradients in orange ("sun") on top and blue ("sky") on bottom, enhancing depth and thematic color accents.  
   - Title and subtitle text styled with responsive font sizing and subtle shading.

4. **Product Panel (.shop-grid > .container)**  
   - The product container uses multi-layered translucent "plates" (via pseudo-elements) offset up and down with different blur and shadows to mimic glass depth layering.  
   - Container itself is a blurred, semi-transparent card with rounded corners and a subtle border.

5. **Controls and Chips (.pp-controls, .pp-chips)**  
   - Sticky control toolbar under the navbar with grid layout and glass effect background.  
   - Search inputs and selects styled with rounded borders and focus outlines using brand colors.  
   - Filter "chips" styled as pill buttons that visually toggle states with color changes and inset shadows.

6. **Product Grid and Cards (.pp-grid, .pp-card)**  
   - Responsive grid layout for product cards with flexible column count and gap.  
   - Product cards are glass-like white containers with subtle shadows, rounded corners, and overflow hidden.  
   - Image containers adapt aspect ratio responsively, ensuring consistent presentation.  
   - Titles support multiline truncation with ellipsis.  
   - Wishlist "pill" button toggles with color state for user interaction.

7. **Skeleton Loading Placeholders (.pp-skel)**  
   - Placeholder cards for loading states, featuring animated shimmering bars and blocks to signify content loading.

8. **Link and Focus Styles**  
   - Anchor tags adopt the accent "sky" color with visible outlines on keyboard focus.

9. **Responsive Adjustments**  
   - Control toolbar layout adjusts grid columns for narrower viewports (two columns at ≤860px, single column at ≤560px).

10. **No-Blur Fallbacks**  
   - For browsers that don’t support `backdrop-filter`, background colors are force-applied to maintain visual clarity without blur.

Overall, this CSS creates a visually rich, glassy, multi-layered shop interface with a warm/cool color theme (orange + blue), responsive layout, accessible focus styles, and graceful degradation for unsupported CSS features.