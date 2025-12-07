export interface Document {
  id: string;
  name: string;
  ocrType: 'electronic' | 'handwritten' | 'scan';
}

interface DocumentListProps {
  documents: Document[];
}

const ocrTypeLabels: Record<Document['ocrType'], string> = {
  electronic: 'OCR: Elektroniczny',
  handwritten: 'OCR: Odręczny',
  scan: 'OCR: Skan',
};

const ocrTypeClasses: Record<Document['ocrType'], string> = {
  electronic: 'bg-gray-200 text-gray-700',
  handwritten: 'bg-cyan-100 text-cyan-800',
  scan: 'bg-gray-200 text-gray-700',
};

const DocumentList = ({ documents }: DocumentListProps) => {
  return (
    <>
      {documents.map((doc) => (
        <div key={doc.id} className="flex justify-between items-center py-1 px-2 pb-2 border-b border-gray-100 text-sm last:border-b-0">
          <span>{doc.name}</span>
          <span className={`py-1 px-1 text-xs font-semibold rounded-sm min-w-[120px] text-center inline-block ${ocrTypeClasses[doc.ocrType]}`}>
            {ocrTypeLabels[doc.ocrType]}
          </span>
        </div>
      ))}
    </>
  );
};

export default DocumentList;
