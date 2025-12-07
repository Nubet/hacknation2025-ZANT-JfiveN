import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import Card from './components/Card';
import AnalysisRow from './components/AnalysisRow';
import AlertBox from './components/AlertBox';
import DocumentPreview from './components/DocumentPreview';
import EmployeeZantHeader from './components/EmployeeZantHeader';
import type { EmployeeCaseData } from '../types/caseTypes';
import { api } from '../apiClient';


const EmployeeDashboard = () => {
  const location = useLocation();
  const locationState = location.state as { caseData?: EmployeeCaseData } | null;
  const caseData = locationState?.caseData;
  const [employeeDocuments, setEmployeeDocuments] = useState<Array<{ title: string; content: string }> | null>(null);

  // Fetch employee documents with opinion
  useEffect(() => {
    const fetchEmployeeDocuments = async () => {
      if (!caseData?.caseId) return;

      try {
        console.log('[EmployeeDashboard] Fetching employee documents with opinion');
        const docs = await api.getEmployeeDocuments(caseData.caseId);

        const mappedDocs = [];

        // Add opinion document FIRST if available (default tab for employee)
        if (docs.opinionHtml) {
          mappedDocs.push({ title: 'Opinia w sprawie kwalifikacji wypadku', content: docs.opinionHtml });
        }

        // Then add other documents
        mappedDocs.push(
          { title: 'Zawiadomienie o wypadku przy pracy', content: docs.notificationHtml },
          { title: 'Wyjaśnienia poszkodowanego', content: docs.explanationHtml }
        );

        setEmployeeDocuments(mappedDocs);
        console.log('[EmployeeDashboard] Employee documents loaded:', mappedDocs.length);
      } catch (error) {
        console.error('[EmployeeDashboard] Error fetching employee documents:', error);
        // Fallback to documents from caseData if API fails
        if (caseData.documents.length > 0) {
          setEmployeeDocuments(caseData.documents.map(doc => ({
            title: doc.title,
            content: doc.preview
          })));
        }
      }
    };

    fetchEmployeeDocuments();
  }, [caseData?.caseId, caseData?.documents]);

  // Redirect if no case data
  if (!caseData) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <EmployeeZantHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Brak danych sprawy</h2>
            <p className="text-gray-600">Nie otrzymano danych z poprzedniego ekranu.</p>
          </div>
        </div>
      </div>
    );
  }

  const legalQualifications = caseData.definitions.map((def, index) => ({
    id: String(index + 1),
    title: def.title,
    description: def.note || (def.status === 'complete' ? 'Potwierdzone' : def.status === 'partial' ? 'Częściowo potwierdzone' : 'Brak danych'),
    status: def.status
  }));

  // Use employee documents (with opinion) if available, otherwise fallback to case data
  const documentPreviewContent = employeeDocuments && employeeDocuments.length > 0
    ? employeeDocuments[0].content
    : (caseData.documents.length > 0 ? caseData.documents[0].preview : null);

  // Pass all documents for preview tabs (employee documents include opinion)
  const allDocumentPreviews = employeeDocuments ||
    (caseData.documents.length > 0
      ? caseData.documents.map(doc => ({
          title: doc.title,
          content: doc.preview
        }))
      : null);

  // Case metadata
  const caseId = caseData.caseId;
  const submittedDate = new Date(caseData.submittedAt).toLocaleDateString('pl-PL');
  const progress = caseData.progress;

  // Extract person name from case data
  const getPersonName = (): string => {
    return caseData.submitterName || 'Poszkodowany';
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
          {/* Data source indicator */}
          <div className="bg-primary-light border border-primary-main text-primary-dark px-4 py-2 rounded text-sm">
            📋 Dane sprawy otrzymane z formularza zgłoszeniowego • Postęp: {progress}%
          </div>

          <DashboardHeader
            title={`Analiza Wypadku: ${getPersonName()}`}
            signature={caseId}
            dateReceived={submittedDate}
            onExportPdf={handleExportPdf}
            onApprove={handleApprove}
          />

          <div className="grid grid-cols-[1fr_1fr] gap-5 max-[900px]:grid-cols-1">
            {/* Card 1: Legal Qualification (left, top) */}
            <Card className="col-start-1 row-start-1" title="1. Kwalifikacja Prawna Wypadku">
              <div className="grid grid-cols-1 gap-4 pt-8">
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

            {/* Card 2: Generated Document Preview (right, spanning 3 rows) */}
            <Card
              className="col-start-2 row-start-1 row-span-3 max-[900px]:col-start-1 max-[900px]:row-start-auto max-[900px]:row-span-1"
              title="2. Wygenerowane Projekty Dokumentów"
            >
              <DocumentPreview
                onEdit={handleEdit}
                onExport={handleExportPdf}
                customContent={documentPreviewContent}
                documents={allDocumentPreviews}
              />
            </Card>

            {/* Card 3: Detected Discrepancies (left, middle) */}
            <Card
              className="col-start-1 row-start-2"
              title="3. Wykryte Rozbieżności"
              isAlert={caseData.requiredInfos.some(r => r.type === 'required')}
            >
              {caseData.requiredInfos.length > 0 ? (
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
                </>
              ) : (
                <AlertBox title="Brak rozbieżności" variant="info">
                  <p className="m-0">Nie wykryto istotnych rozbieżności w dokumentacji.</p>
                </AlertBox>
              )}
            </Card>

            {/* Card 4: Suggested Documents (left, bottom) */}
            <Card className="col-start-1 row-start-3" title="4. Sugestie Uzupełnień">
              {caseData.documentsToPrep.length > 0 ? (
                caseData.documentsToPrep.map((doc, idx) => (
                  <AnalysisRow
                    key={`doc-${idx}`}
                    iconType="warning"
                    title="Wymagany dokument"
                    description={doc.text}
                  />
                ))
              ) : (
                <div className="text-gray-600 text-sm p-4">
                  Brak sugestii uzupełnień - dokumentacja jest kompletna.
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

