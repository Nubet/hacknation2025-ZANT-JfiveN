import React from 'react';

interface ZantHeaderProps {
    step: string;
}

const ZantHeader: React.FC<ZantHeaderProps> = ({ step }) => (
    <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '20px 0', borderBottom: '2px solid #006b4f', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/images.png" alt="ZANT Logo" style={{ height: 48 }} />
            <span style={{ fontWeight: 700, fontSize: '1.7rem', color: '#006b4f', marginLeft: 8 }}>Asystent zgłoszenia ZANT</span>
        </div>
        <div style={{ background: '#006b4f', color: '#fff', borderRadius: 6, padding: '6px 18px', fontWeight: 600, fontSize: '1rem', minWidth: 90, textAlign: 'center' }}>
            {step}
        </div>
    </header>
);

export default ZantHeader;

