import { useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import Card from './components/Card';
import DocumentList from './components/DocumentList';
import type { Document } from './components/DocumentList';
import AnalysisRow from './components/AnalysisRow';
import AlertBox from './components/AlertBox';
import DocumentPreview from './components/DocumentPreview';
import EmployeeZantHeader from './components/EmployeeZantHeader';
import type { EmployeeCaseData } from '../types/caseTypes';

// Default/fallback data when no case data is passed
const defaultDocuments: Document[] = [
  { id: '1', name: 'Zawiadomienie o wypadku (Z-10)', ocrType: 'electronic' },
  { id: '2', name: 'Zapis wyjaśnień poszkodowanego', ocrType: 'handwritten' },
  { id: '3', name: 'Protokół powypadkowy BHP', ocrType: 'scan' },
  { id: '4', name: 'Dokumentacja medyczna SOR', ocrType: 'scan' },
];

const defaultLegalQualifications = [
  { id: '1', title: 'Nagłość zdarzenia', description: 'Tak. Upadek z drabiny.' },
  { id: '2', title: 'Przyczyna zewnętrzna', description: 'Tak. Pęknięcie szczebla drabiny.' },
  { id: '3', title: 'Skutek (uraz)', description: 'Złamanie kości piszczelowej.' },
  { id: '4', title: 'Związek z pracą', description: 'Tak. Podczas inwentaryzacji.' },
];

const EmployeeDashboard = () => {
  const location = useLocation();
  const locationState = location.state as { caseData?: EmployeeCaseData } | null;
  const caseData = locationState?.caseData;

  // Determine if we have real data or use defaults
  const hasRealData = !!caseData;

  // Map case data to display formats
  const analyzedDocuments: Document[] = hasRealData && caseData.documents.length > 0
    ? caseData.documents.map((doc, index) => ({
        id: doc.id,
        name: doc.title,
        ocrType: index === 0 ? 'electronic' as const : 'scan' as const
      }))
    : defaultDocuments;

  const legalQualifications = hasRealData && caseData.definitions.length > 0
    ? caseData.definitions.map((def, index) => ({
        id: String(index + 1),
        title: def.title,
        description: def.note || (def.status === 'complete' ? 'Potwierdzone' : def.status === 'partial' ? 'Częściowo potwierdzone' : 'Brak danych'),
        status: def.status
      }))
    : defaultLegalQualifications.map(q => ({ ...q, status: 'complete' as const }));

  // Generate document preview content from case data
  const documentPreviewContent = hasRealData && caseData.documents.length > 0
    ? caseData.documents[0].preview
    : null;

  // Case metadata
  const caseId = caseData?.caseId || 'ZUS-KW-2024/11/004';
  const submittedDate = caseData?.submittedAt
    ? new Date(caseData.submittedAt).toLocaleDateString('pl-PL')
    : '04.12.2024';
  const progress = caseData?.progress || 0;

  // Extract person name from chat history if available
  const getPersonName = (): string => {
    if (!caseData?.chatHistory) return 'Jan Kowalski';
    // For now, return default - in real app you'd extract from form data
    return 'Poszkodowany';
  };

  const handleExportPdf = () => {
    console.log('Eksportuj PDF');
  };

  const handleApprove = () => {
    console.log('Zatwierdź sprawę');
    alert('Sprawa została zatwierdzona!');
  };

  const handleEdit = () => {
    console.log('Edytuj treść');
  };

  const handleExportWord = () => {
    console.log('Eksportuj do Word');
  };

  const handleGenerateRequest = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Generuj wniosek do Głównego Lekarza Orzecznika ZUS');
  };

  // Determine icon type based on status
  const getIconType = (status: string): 'success' | 'warning' => {
    return status === 'complete' ? 'success' : 'warning';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <EmployeeZantHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-y-auto p-8 gap-5">
          {/* Show data source indicator */}
          {hasRealData && (
            <div className="bg-primary-light border border-primary-main text-primary-dark px-4 py-2 rounded text-sm">
              📋 Dane sprawy otrzymane z formularza zgłoszeniowego • Postęp: {progress}%
            </div>
          )}

          <DashboardHeader
            title={`Analiza Wypadku: ${getPersonName()}`}
            signature={caseId}
            dateReceived={submittedDate}
            onExportPdf={handleExportPdf}
            onApprove={handleApprove}
          />

          <div className="grid grid-cols-[1fr_2fr] gap-5 max-[900px]:grid-cols-1">
            {/* Row 1: Card 1 (left) */}
            <Card
              className="col-start-1 row-start-1"
              title="1. Przeanalizowane Dokumenty"
            >
              <DocumentList documents={analyzedDocuments} />
            </Card>

            {/* Row 1: Card 2 (right) */}
            <Card className="col-start-2 row-start-1 max-[900px]:col-start-1" title="2. Kwalifikacja Prawna Wypadku">
              <div className="grid grid-cols-2 gap-4 pt-8 max-[900px]:grid-cols-1">
                {legalQualifications.map((item) => (
                  <AnalysisRow
                    key={item.id}
                    iconType={getIconType(item.status)}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
              <div className="bg-primary-light border border-[#d0e0dc] p-2.5 mt-8 text-sm text-primary-dark border-l-4 border-l-primary-main">
                <strong>Wstępna ocena AI:</strong> {
                  legalQualifications.every(q => q.status === 'complete')
                    ? 'Zdarzenie spełnia definicję wypadku przy pracy (art. 3 ustawy wypadkowej).'
                    : 'Wymagana dodatkowa weryfikacja - nie wszystkie kryteria zostały potwierdzone.'
                }
              </div>
            </Card>

            {/* Row 2: Card 3 (left) */}
            <Card
              className="col-start-1 row-start-2"
              title="3. Wykryte Rozbieżności"
              isAlert={hasRealData && caseData.requiredInfos.some(r => r.type === 'required')}
            >
              {hasRealData && caseData.requiredInfos.length > 0 ? (
                <>
                  {caseData.requiredInfos.filter(r => r.type === 'required').map((info, idx) => (
                    <AlertBox key={`req-${idx}`} title="Brakująca informacja wymagana">
                      <p className="m-0">{info.text}</p>
                    </AlertBox>
                  ))}
                  {caseData.requiredInfos.filter(r => r.type === 'recommended').map((info, idx) => (
                    <AlertBox key={`rec-${idx}`} title="Zalecane uzupełnienie" variant="info">
                      <p className="m-0">{info.text}</p>
                    </AlertBox>
                  ))}
                  {caseData.requiredInfos.length === 0 && (
                    <AlertBox title="Brak rozbieżności" variant="info">
                      <p className="m-0">Nie wykryto istotnych rozbieżności w dokumentacji.</p>
                    </AlertBox>
                  )}
                </>
              ) : (
                <>
                  <AlertBox title="Niezgodność daty zdarzenia">
                    <p className="m-0 mb-1">
                      <strong>Zawiadomienie:</strong> 02.12.2024
                    </p>
                    <p className="m-0">
                      <strong>Wyjaśnienia poszkodowanego:</strong> 03.12.2024
                    </p>
                    <p className="mt-2 italic text-amber-700 text-xs">
                      Sugerowane działanie: Weryfikacja z harmonogramem pracy (pobrano z załącznika nr 3).
                    </p>
                  </AlertBox>
                  <AlertBox title="Miejsce zdarzenia" variant="info">
                    <p className="m-0">
                      Dane spójne w 3 dokumentach: "Hala Magazynowa B, Sektor 4".
                    </p>
                  </AlertBox>
                </>
              )}
            </Card>

            {/* Row 3: Card 4 (left) */}
            <Card className="col-start-1 row-start-3" title="4. Sugestie Uzupełnień">
              {hasRealData && caseData.documentsToPrep.length > 0 ? (
                caseData.documentsToPrep.map((doc, idx) => (
                  <AnalysisRow
                    key={`doc-${idx}`}
                    iconType="warning"
                    title="Wymagany dokument"
                    description={doc.text}
                  />
                ))
              ) : (
                <AnalysisRow
                  iconType="warning"
                  title="Wymagana opinia lekarska"
                  description="Wątpliwość: Uraz kręgosłupa (odcinek L4) może być schorzeniem samoistnym, a nie skutkiem nagłym."
                >
                  <a
                    href="#"
                    className="text-primary-main no-underline font-semibold text-xs inline-block mt-1 hover:underline"
                    onClick={handleGenerateRequest}
                  >
                    Generuj wniosek do Głównego Lekarza Orzecznika ZUS
                  </a>
                </AnalysisRow>
              )}
            </Card>

            {/* Rows 2-3: Card 5 (right, spanning 2 rows) */}
            <Card
              className="col-start-2 row-start-2 row-span-2 max-[900px]:col-start-1 max-[900px]:row-start-auto max-[900px]:row-span-1"
              title="5. Wygenerowane Projekty Dokumentów"
            >
              <DocumentPreview
                onEdit={handleEdit}
                onExport={handleExportWord}
                customContent={documentPreviewContent}
              />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

