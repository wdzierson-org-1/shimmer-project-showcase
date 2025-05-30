
import { cn } from '@/lib/utils';

// Common button styles
export const buttonStyles = {
  ghost: "bg-transparent hover:bg-muted/60 transition-colors",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
};

// Common layout styles
export const layoutStyles = {
  container: "container mx-auto px-4 md:px-6",
  stickyHeader: "sticky top-0 z-10 bg-background/40 backdrop-blur-sm",
  fullHeight: "min-h-screen h-screen",
  flexCol: "flex flex-col",
  gridResponsive: "grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12",
};

// Common text styles
export const textStyles = {
  heading: "font-serif text-xl md:text-3xl font-semibold",
  subheading: "text-lg font-medium text-muted-foreground",
  body: "text-sm md:text-base",
  small: "text-xs md:text-sm text-muted-foreground",
};

// Common spacing
export const spacing = {
  section: "space-y-6 md:space-y-8",
  content: "py-4 px-6",
  dialogContent: "max-w-full w-full h-[90vh] p-0 rounded-lg",
};

// Helper function to combine styles
export const combineStyles = (...styles: string[]) => cn(...styles);
