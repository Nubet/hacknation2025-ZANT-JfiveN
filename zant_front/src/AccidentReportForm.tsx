import React, { useState } from 'react';
import './AccidentReportForm.css';
import ZantHeader from './ZantHeader';

interface FormData {
    imie: string;
    nazwisko: string;
    pesel: string;
    telefon: string;
    opis: string;
}

const AccidentReportForm: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        imie: '',
        nazwisko: '',
        pesel: '',
        telefon: '',
        opis: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSubmit = () => {
        console.log('Form data submitted:', formData);
        // Add your submission logic here
    };

    return (
        <div className="app-shell">
            <ZantHeader step="Krok 1 - Twoje dane i opis wypadku" />

            <div className="main-window">
                <div className="page-subtitle" style={{ textAlign: 'left', marginBottom: 24, color: '#333', fontSize: '1.05rem', fontWeight: 400 }}>
                    Prosimy o podanie podstawowych danych oraz szczegółowy opis zdarzenia. Na podstawie tych informacji system przygotuje wstępny przebieg wypadku, a w kolejnym kroku przeprowadzimy Państwa przez formalne pytania wymagane do zgłoszenia wypadku przy pracy.
                </div>

                <section className="chat-shell">
                    <div className="chat-header">
                        <div className="chat-title">Krok 1 - Twoje dane i opis wypadku</div>
                        <div className="chat-subtitle">
                            To nie jest formularz do przepisów. Najpierw zbieramy podstawowe dane i opis, resztę dopytamy później.
                        </div>
                    </div>

                    <div className="chat-body">
                        <div className="assistant-bubble">
                            <strong>Na początek potrzebuję:</strong>
                            <ul>
                                <li>Twoich podstawowych danych (żeby przypisać sprawę do właściwej osoby),</li>
                                <li>opisu wypadku tak, jak Ty go pamiętasz.</li>
                            </ul>
                            W kolejnym kroku system uporządkuje te informacje pod kątem wymogów ZUS i pokaże panel z tym, co już mamy,
                            a czego jeszcze brakuje.
                        </div>
                        <div className="assistant-meta">Asystent ZANT</div>

                        <div className="section-label">Dane podstawowe</div>
                        <div className="content-center">
                            <div className="card">
                                <div className="card-title">Twoje dane identyfikacyjne</div>
                                <div className="card-subtitle">
                                    Te informacje pojawią się potem w zawiadomieniu i w wyjaśnieniach. W MVP zakładamy zgłoszenie przez samego poszkodowanego.
                                </div>
                                <div className="grid-2">
                                    <div className="form-field">
                                        <label htmlFor="imie" className="form-label">Imię</label>
                                        <input
                                            id="imie"
                                            className="form-input"
                                            placeholder="Jan"
                                            value={formData.imie}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="nazwisko" className="form-label">Nazwisko</label>
                                        <input
                                            id="nazwisko"
                                            className="form-input"
                                            placeholder="Kowalski"
                                            value={formData.nazwisko}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="pesel" className="form-label">PESEL</label>
                                        <input
                                            id="pesel"
                                            className="form-input pesel"
                                            placeholder="84010112345"
                                            value={formData.pesel}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="telefon" className="form-label">Telefon kontaktowy (opcjonalnie)</label>
                                        <input
                                            id="telefon"
                                            className="form-input"
                                            placeholder="123 456 789"
                                            value={formData.telefon}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label className="input-label" htmlFor="opis">
                            Opis wypadku (tak jak w mailu lub oświadczeniu):
                        </label>
                        <textarea
                            id="opis"
                            className="textarea"
                            placeholder="Np. Prowadzę działalność..., dnia..., w miejscu..., wykonywałem..., wydarzyło się..., doznałem urazu..., byłem w szpitalu/SOR..."
                            value={formData.opis}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="footer-row">
                        <div className="hint">
                            Po kliknięciu przycisku system wstępnie wyodrębni czas, miejsce, przyczynę zewnętrzną i uraz,
                            a następnie przełączysz się na drugi ekran z rozmową doprecyzowującą i podsumowaniem sprawy.
                        </div>
                        <button className="primary-btn" onClick={handleSubmit}>
                            Wyślij dane i przejdź dalej
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AccidentReportForm;
