import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const PlayoffsIcon: React.FC<IconProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M17.5 2H20L13.5 9H10.5L4 2H6.5L12 8.1L17.5 2Z" fill="currentColor" />
      <rect x="9" y="8" width="6" height="2" rx="0.5" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 10C8.68629 10 6 12.6863 6 16C6 19.3137 8.68629 22 12 22C15.3137 22 18 19.3137 18 16C18 12.6863 15.3137 10 12 10ZM10.2 13.5C10.8 14.1 10.8 17.9 10.2 18.5C9.7 17.9 9.7 14.1 10.2 13.5ZM13.8 13.5C13.2 14.1 13.2 17.9 13.8 18.5C14.3 17.9 14.3 14.1 13.8 13.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
