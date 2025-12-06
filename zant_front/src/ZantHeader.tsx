import React from 'react';

interface ZantHeaderProps {
    step: string;
}

const ZantHeader: React.FC<ZantHeaderProps> = ({ step }) => (
    <header className="flex items-center justify-between bg-white py-5 border-b-2 border-primary-main mb-0 p-4">
        <div className="flex items-center gap-4">
            <img src="/images.png" alt="ZANT Logo" className="h-12" />
            <span className="font-bold text-[1.7rem] text-primary-main ml-2">Asystent zgłoszenia ZANT</span>
        </div>
        <div className="bg-primary-main text-white rounded-md px-[18px] py-1.5 font-semibold text-base min-w-[90px] text-center">
            {step}
        </div>
    </header>
);

export default ZantHeader;

