import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function Loading({ size = 'md', text }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`loading-spinner ${sizeClasses[size]}`} />
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </div>
  );
}
