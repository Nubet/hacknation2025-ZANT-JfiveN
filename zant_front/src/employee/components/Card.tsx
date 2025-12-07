import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
  isAlert?: boolean;
}

const Card = ({ title, children, className = '', badge, isAlert = false }: CardProps) => {
  return (
    <div className={`bg-bg-panel border border-border rounded-none shadow-sm p-5 flex flex-col gap-4 mb-5 ${className}`}>
      <div className={`text-base font-bold pb-2.5 border-b-2 flex justify-between items-center
        ${isAlert ? 'border-b-status-error text-status-error' : 'border-b-primary-light text-text-main'}`}>
        {title}
        {badge}
      </div>
      {children}
    </div>
  );
};

export default Card;
