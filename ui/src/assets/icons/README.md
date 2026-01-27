# Custom Icons

This folder contains custom SVG icons as React components for the landing page cards.

## Format: SVG as React Components

**Why this format?**
- ✅ Full control over styling (can use Tailwind classes)
- ✅ TypeScript support
- ✅ Can pass props (size, className, colors)
- ✅ No additional dependencies needed
- ✅ Works seamlessly with React and Vite

## How to Add a New Icon

1. **Create a new icon component file** (e.g., `MyIcon.tsx`):
```tsx
import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const MyIcon: React.FC<IconProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paste your SVG paths here */}
    </svg>
  );
};
```

2. **Export it from `index.ts`**:
```ts
export { MyIcon } from "./MyIcon";
```

3. **Use it in your component**:
```tsx
import { MyIcon } from "@/assets/icons";

<MyIcon className="text-white" size={32} />
```

## Getting SVG Code

1. Design your icon in Figma, Illustrator, or any vector tool
2. Export as SVG
3. Copy the SVG code
4. Extract the `<path>`, `<circle>`, `<rect>`, etc. elements
5. Paste them inside the `<svg>` tag in your component

## Tips

- Use `currentColor` for the fill/stroke to inherit text color
- Set `viewBox` to match your original SVG dimensions
- Keep the `size` prop flexible for different use cases
- Use `className` prop to apply Tailwind classes
