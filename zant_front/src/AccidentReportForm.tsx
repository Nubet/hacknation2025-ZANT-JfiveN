import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ZantHeader from './ZantHeader';
import { api, ApiError } from './apiClient';
import type { InitialCaseRequest } from './apiClient';

interface FormData {
    imie: string;
    nazwisko: string;
    pesel: string;
    telefon: string;
    opis: string;
}


const AccidentReportForm: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<FormData>({
        imie: '',
        nazwisko: '',
        pesel: '',
        telefon: '',
        opis: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.imie.trim() || !formData.nazwisko.trim() || !formData.pesel.trim() || !formData.opis.trim()) {
            setError('Proszę wypełnić wszystkie wymagane pola (Imię, Nazwisko, PESEL, Opis wypadku)');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Prepare request according to OpenAPI spec
            const requestBody: InitialCaseRequest = {
                first_name: formData.imie,
                last_name: formData.nazwisko,
                pesel: formData.pesel,
                description: formData.opis
            };

            // Add phone_number only if provided
            if (formData.telefon.trim()) {
                requestBody.phone_number = formData.telefon;
            }

            console.log('[AccidentReportForm] Request body:', requestBody);
            const data = await api.initCase(requestBody);
            console.log('[AccidentReportForm] Response:', data);

            console.log('[AccidentReportForm] Case created successfully:', data);
            console.log('[AccidentReportForm] Navigating to:', `/case/edit/${data.caseId}`);

            // Navigate to the second screen with the case ID
            navigate(`/case/edit/${data.caseId}`, {
                state: {
                    caseId: data.caseId,
                    createdAt: data.createdAt
                }
            });

        } catch (err) {
            console.error('Error submitting form:', err);
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col p-[30px_15px] gap-[30px] font-['Open_Sans','Segoe_UI',Tahoma,Geneva,Verdana,sans-serif] bg-bg-main text-text-main text-base leading-normal">
            <ZantHeader step="Krok 1 - Twoje dane i opis wypadku" />

            <div className="max-w-[2000px] w-[85vw] bg-bg-panel rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-border mx-auto p-6 flex flex-col gap-5">
                <div className="text-left mb-6 text-text-main text-[1.05rem] font-normal">
                    Prosimy o podanie podstawowych danych oraz szczegółowy opis zdarzenia. Na podstawie tych informacji system przygotuje wstępny przebieg wypadku, a w kolejnym kroku przeprowadzimy Państwa przez formalne pytania wymagane do zgłoszenia wypadku przy pracy.
                </div>

                <section className="bg-bg-panel border border-border rounded-none shadow-[0_1px_3px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-border bg-[#fcfcfc]">
                        <div className="text-[1.25rem] font-semibold text-primary-main mb-[5px]">Krok 1 - Twoje dane i opis wypadku</div>
                        <div className="text-[0.875rem] text-text-light">
                            To nie jest formularz do przepisów. Najpierw zbieramy podstawowe dane i opis, resztę dopytamy później.
                        </div>
                    </div>

                    <div className="p-[30px] flex flex-col gap-5">
                        <div className="bg-primary-light border-l-4 border-primary-main rounded-none p-[15px] text-base text-text-main">
                            <strong>Na początek potrzebuję:</strong>
                            <ul className="mt-[10px] ml-5 p-0 text-text-main">
                                <li>Twoich podstawowych danych (żeby przypisać sprawę do właściwej osoby),</li>
                                <li>opisu wypadku tak, jak Ty go pamiętasz.</li>
                            </ul>
                            W kolejnym kroku system uporządkuje te informacje pod kątem wymogów ZUS i pokaże panel z tym, co już mamy,
                            a czego jeszcze brakuje.
                        </div>
                        <div className="text-[0.75rem] text-text-light font-bold uppercase mt-[5px] mb-[15px]">Asystent ZANT</div>

                        <div className="text-base font-bold text-text-main mt-[10px] border-b-2 border-primary-dark inline-block pb-[5px] mb-[15px]">Dane podstawowe</div>
                        <div>
                            <div className="border border-border rounded-none bg-white p-5 flex flex-col gap-[15px]">
                                <div className="text-[1.1rem] font-semibold text-text-main">Twoje dane identyfikacyjne</div>
                                <div className="text-[0.875rem] text-text-light mb-[10px]">
                                    Te informacje pojawią się potem w zawiadomieniu i w wyjaśnieniach. W MVP zakładamy zgłoszenie przez samego poszkodowanego.
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="imie" className="text-[0.875rem] font-semibold text-text-main">Imię</label>
                                        <input
                                            id="imie"
                                            className="rounded-none border border-border py-2 px-3 text-base outline-none bg-white text-text-main transition-all duration-200 focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)]"
                                            placeholder="Jan"
                                            value={formData.imie}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="nazwisko" className="text-[0.875rem] font-semibold text-text-main">Nazwisko</label>
                                        <input
                                            id="nazwisko"
                                            className="rounded-none border border-border py-2 px-3 text-base outline-none bg-white text-text-main transition-all duration-200 focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)]"
                                            placeholder="Kowalski"
                                            value={formData.nazwisko}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="pesel" className="text-[0.875rem] font-semibold text-text-main">PESEL</label>
                                        <input
                                            id="pesel"
                                            className="rounded-none border border-border py-2 px-3 text-base outline-none bg-white text-text-main transition-all duration-200 focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)] font-mono tracking-wider"
                                            placeholder="84010112345"
                                            value={formData.pesel}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="telefon" className="text-[0.875rem] font-semibold text-text-main">Telefon kontaktowy (opcjonalnie)</label>
                                        <input
                                            id="telefon"
                                            className="rounded-none border border-border py-2 px-3 text-base outline-none bg-white text-text-main transition-all duration-200 focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)]"
                                            placeholder="123 456 789"
                                            value={formData.telefon}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label className="text-base font-semibold text-text-main mt-[10px]" htmlFor="opis">
                            Opis wypadku (tak jak w mailu lub oświadczeniu):
                        </label>
                        <textarea
                            id="opis"
                            className="w-full rounded-none border border-border p-3 text-base font-['Open_Sans',sans-serif] resize-y min-h-[160px] outline-none bg-white transition-all duration-200 focus:border-primary-main focus:shadow-[0_0_0_1px_var(--color-primary-main)]"
                            placeholder="Np. Prowadzę działalność..., dnia..., w miejscu..., wykonywałem..., wydarzyło się..., doznałem urazu..., byłem w szpitalu/SOR..."
                            value={formData.opis}
                            onChange={handleInputChange}
                        />

                        {error && (
                            <div className="bg-red-50 border-l-4 border-status-error p-4 text-status-error text-sm">
                                <strong>Błąd:</strong> {error}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center p-[20px_30px] border-t border-border bg-[#f9f9f9] gap-5 flex-wrap">
                        <div className="text-[0.875rem] text-text-light max-w-[50%] italic">
                            Po kliknięciu przycisku system wstępnie wyodrębni czas, miejsce, przyczynę zewnętrzną i uraz,
                            a następnie przełączysz się na drugi ekran z rozmową doprecyzowującą i podsumowaniem sprawy.
                        </div>
                        <button
                            className="rounded border-none bg-secondary-main text-secondary-dark py-[10px] px-[30px] text-base font-bold cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-secondary-dark hover:-translate-y-px hover:shadow-[0_2px_5px_rgba(0,0,0,0.2)] hover:text-secondary-main disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Wysyłanie...' : 'Wyślij dane i przejdź dalej'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AccidentReportForm;
