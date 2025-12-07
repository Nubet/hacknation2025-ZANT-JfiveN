import { useState } from 'react';

interface DocumentPreviewProps {
  onEdit?: () => void;
  onExport?: () => void;
  customContent?: string | null;
  documents?: Array<{ title: string; content: string }> | null;
}

const DocumentPreview = ({ onEdit, onExport, customContent, documents }: DocumentPreviewProps) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  // Use documents if provided, otherwise fall back to customContent or default
  const hasDocuments = documents && documents.length > 0;
  const currentContent = hasDocuments ? documents[activeTab]?.content : customContent;

  return (
    <>
      {hasDocuments ? (
        <div className="flex gap-2.5 mb-4 flex-wrap">
          {documents.map((doc: { title: string; content: string }, index: number) => (
            <button
              key={index}
              className={`text-xs px-4 py-1.5 rounded-[4px] cursor-pointer transition-all duration-200 ${
                activeTab === index
                  ? 'border-none bg-secondary-main text-secondary-dark font-bold shadow-sm hover:bg-secondary-dark hover:text-secondary-main'
                  : 'border border-border bg-white text-text-muted font-semibold hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(index)}
            >
              {doc.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="bg-gray-50 border border-border p-6 font-mono text-[0.85rem] leading-relaxed text-gray-800 h-[500px] overflow-y-auto mb-4 shadow-inner">
        {currentContent ? (
          <div dangerouslySetInnerHTML={{ __html: currentContent }} />
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

