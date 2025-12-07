import { useState } from 'react';

interface DocumentPreviewProps {
  onEdit?: () => void;
  onExport?: () => void;
  customContent?: string | null;
}

const DocumentPreview = ({ onEdit, onExport, customContent }: DocumentPreviewProps) => {
  const [activeTab, setActiveTab] = useState<'opinion' | 'card'>('opinion');

  return (
    <>
      <div className="flex gap-2.5 mb-4">
        <button
          className={`text-xs px-4 py-1.5 rounded-[4px] cursor-pointer transition-all duration-200 ${
            activeTab === 'opinion'
              ? 'border-none bg-secondary-main text-secondary-dark font-bold shadow-sm hover:bg-secondary-dark hover:text-secondary-main'
              : 'border border-border bg-white text-text-muted font-semibold hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('opinion')}
        >
          Projekt Opinii
        </button>
        <button
          className={`text-xs px-4 py-1.5 rounded-[4px] cursor-pointer transition-all duration-200 ${
            activeTab === 'card'
              ? 'border-none bg-secondary-main text-secondary-dark font-bold shadow-sm hover:bg-secondary-dark hover:text-secondary-main'
              : 'border border-border bg-white text-text-muted font-semibold hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('card')}
        >
          Projekt Karty Wypadku (Wzór 2022)
        </button>
      </div>

      <div className="bg-gray-50 border border-border p-6 font-mono text-[0.85rem] leading-relaxed text-gray-800 h-[500px] overflow-y-auto mb-4 shadow-inner">
        {customContent ? (
          <div dangerouslySetInnerHTML={{ __html: customContent }} />
        ) : (
          <>
            <strong>PROJEKT OPINII W SPRAWIE KWALIFIKACJI ZDARZENIA</strong>
            <br />
            <br />

            <strong>1. Ustalenia faktyczne:</strong>
            <br />
            W dniu 02.12.2024 r. Pan Jan Kowalski wykonywał czynności służbowe w magazynie.
            Podczas wchodzenia na drabinę doszło do pęknięcia szczebla, w wyniku czego
            poszkodowany upadł na betonowe podłoże.
            <br />
            <br />

            <strong>2. Analiza prawna:</strong>
            <br />
            Analizując zgromadzony materiał dowodowy, w tym wyjaśnienia poszkodowanego oraz
            zapis monitoringu (opisany w protokole BHP), stwierdza się, że:
            <br />
            - Zdarzenie miało charakter nagły.
            <br />
            - Przyczyną była wada materiałowa sprzętu (czynnik zewnętrzny).
            <br />
            - Skutkiem jest uraz potwierdzony dokumentacją medyczną.
            <br />
            - Do zdarzenia doszło w godzinach pracy.
            <br />
            <br />

            <strong>3. Wniosek:</strong>
            <br />
            Proponuje się <strong>UZNAĆ</strong> zdarzenie za wypadek przy pracy w rozumieniu
            art. 3 ust. 1 ustawy o ubezpieczeniu społecznym z tytułu wypadków przy pracy.
            <br />
            <br />

            <em className="text-gray-400">Wygenerowano automatycznie: 06.12.2024 14:30</em>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2.5">
        <button
          className="rounded-[4px] border border-border bg-white text-text-main px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-400"
          onClick={onEdit}
        >
          Edytuj treść
        </button>
        <button
          className="rounded-[4px] border-none bg-secondary-main text-secondary-dark px-6 py-2 text-sm font-bold cursor-pointer shadow-sm transition-all duration-200 hover:bg-secondary-dark hover:text-secondary-main"
          onClick={onExport}
        >
          Eksportuj do Word
        </button>
      </div>
    </>
  );
};

export default DocumentPreview;

