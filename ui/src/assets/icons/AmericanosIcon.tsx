import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const AmericanosIcon: React.FC<IconProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 5C20.866 5 24 8.13401 24 12C24 15.866 20.866 19 17 19C15.25 19 13.65 18.35 12.4 17.28L6 20L8.5 15.5L2 12L8.5 8.5L6 4L12.4 6.72C13.65 5.65 15.25 5 17 5ZM14.5 8.5C15.8 9.5 15.8 14.5 14.5 15.5C15.2 14.5 15.2 9.5 14.5 8.5ZM19.5 8.5C18.2 9.5 18.2 14.5 19.5 15.5C18.8 14.5 18.8 9.5 19.5 8.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
