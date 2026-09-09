import React from 'react';

interface EhsaanLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBorder?: boolean;
  alt?: string;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

export const EhsaanLogo: React.FC<EhsaanLogoProps> = ({
  className = '',
  size = 'md',
  showBorder = false,
  alt = 'EHSAAN COLOUR STUDIO Logo'
}) => {
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full ${sizeClass} ${
        showBorder ? 'ring-2 ring-neutral-700/60 shadow-md' : ''
      } ${className}`}
    >
      <img
        src="/ehsaan-logo.jpg"
        alt={alt}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover rounded-full select-none"
      />
    </div>
  );
};
