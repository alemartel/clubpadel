import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const TorneosIcon: React.FC<IconProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M7 2C7.55 2 8 2.45 8 3V6H6V3C6 2.45 6.45 2 7 2Z" fill="currentColor" />
      <path d="M11 2C11.55 2 12 2.45 12 3V6H10V3C10 2.45 10.45 2 11 2Z" fill="currentColor" />
      <path d="M15 2C15.55 2 16 2.45 16 3V6H14V3C14 2.45 14.45 2 15 2Z" fill="currentColor" />
      <path d="M19 2C19.55 2 20 2.45 20 3V6H18V3C18 2.45 18.45 2 19 2Z" fill="currentColor" />
      <rect x="3" y="5" width="18" height="3" rx="0.5" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 10C3 9.44772 3.44772 9 4 9H20C20.5523 9 21 9.44772 21 10V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V10ZM12 11C9.51472 11 7.5 13.0147 7.5 15.5C7.5 17.9853 9.51472 20 12 20C14.4853 20 16.5 17.9853 16.5 15.5C16.5 13.0147 14.4853 11 12 11ZM11.5 13.08C10.85 13.56 10.4 14.45 10.4 15.5C10.4 16.55 10.85 17.44 11.5 17.92V13.08ZM12.5 17.92C13.15 17.44 13.6 16.55 13.6 15.5C13.6 14.45 13.15 13.56 12.5 13.08V17.92Z"
        fill="currentColor"
      />
    </svg>
  );
};
