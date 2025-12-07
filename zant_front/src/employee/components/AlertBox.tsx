import type { ReactNode } from 'react';

interface AlertBoxProps {
  title: string;
  children: ReactNode;
  variant?: 'warning' | 'info';
}

const AlertBox = ({ title, children, variant = 'warning' }: AlertBoxProps) => {
  const baseClasses = "p-3 text-sm border border-l-4";
  const variantClasses = variant === 'info'
    ? "border-gray-300 bg-gray-50 border-l-gray-500 text-gray-600"
    : "border-amber-200 bg-amber-50 border-l-status-warning";

  return (
    <div className={`${baseClasses} ${variantClasses}`}>
      <div className="font-bold mb-1 flex items-center gap-1.5">{title}</div>
      {children}
    </div>
  );
};

export default AlertBox;
