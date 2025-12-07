import type { ReactNode } from 'react';

export type IconType = 'success' | 'warning';

interface AnalysisRowProps {
  iconType: IconType;
  title: string;
  description: string;
  children?: ReactNode;
}

const iconClasses: Record<IconType, string> = {
  success: 'text-status-success border-status-success after:content-["OK"] after:text-[0.6rem]',
  warning: 'text-status-warning border-status-warning after:content-["!"]',
};

const AnalysisRow = ({ iconType, title, description, children }: AnalysisRowProps) => {
  return (
    <div className="flex gap-3 p-2.5 bg-gray-50 border border-gray-100">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-sm shrink-0 border ${iconClasses[iconType]}`}></span>
      <div>
        <strong className="block text-sm mb-0.5">{title}</strong>
        <p className="m-0 text-[0.85rem] text-text-muted">{description}</p>
        {children}
      </div>
    </div>
  );
};

export default AnalysisRow;
