import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const LigasIcon: React.FC<IconProps> = ({ className = "", size = 32 }) => {
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
        d="M19 5H5C3.89543 5 3 5.89543 3 7V8C3 10.512 4.8436 12.597 7.23478 12.9248C7.86873 14.4172 9.22271 15.5422 10.85 15.8672V19H8V21H16V19H13.15V15.8672C14.7773 15.5422 16.1313 14.4172 16.7652 12.9248C19.1564 12.597 21 10.512 21 8V7C21 5.89543 20.1046 5 19 5ZM5 8V7H7V11C7 11 7 11.0001 7.00001 11.0001C6.99616 11.0001 5 10.95 5 8ZM17 11V7H19V8C19 10.95 17.0038 11.0001 17 11.0001V11Z"
        fill="currentColor"
      />
    </svg>
  );
};
