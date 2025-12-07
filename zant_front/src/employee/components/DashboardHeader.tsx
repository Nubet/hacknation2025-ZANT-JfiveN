interface DashboardHeaderProps {
  title: string;
  signature: string;
  dateReceived: string;
  onExportPdf: () => void;
  onApprove: () => void;
}

const DashboardHeader = ({
  title,
  signature,
  dateReceived,
  onExportPdf,
  onApprove,
}: DashboardHeaderProps) => {
  return (
    <header className="flex justify-between items-center border-b border-border pb-5 bg-transparent">
      <div>
        <h1 className="text-3xl font-normal text-primary-main m-0 mb-1">{title}</h1>
        <div className="text-sm text-text-muted flex gap-4">
          <span className="bg-gray-200 px-2 py-0.5 rounded-sm text-xs font-semibold">Sygnatura: {signature}</span>
          <span className="bg-gray-200 px-2 py-0.5 rounded-sm text-xs font-semibold">Data wpłynięcia: {dateReceived}</span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          className="rounded-[4px] border border-border bg-white text-text-main px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-400"
          onClick={onExportPdf}
        >
          Eksportuj PDF
        </button>
        <button
          className="rounded-[4px] border-none bg-secondary-main text-secondary-dark px-6 py-2 text-sm font-bold cursor-pointer shadow-sm transition-all duration-200 hover:bg-secondary-dark hover:text-secondary-main"
          onClick={onApprove}
        >
          Zatwierdź sprawę
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
