import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AccidentReportForm from './AccidentReportForm';
import CaseDetails from './CaseDetails';
import EmployeeDashboard from './employee/EmployeeDashboard';

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/case/create" element={<AccidentReportForm />} />
            <Route path="/case/edit/*" element={<CaseDetails />} />
            <Route path="/employee/*" element={<EmployeeDashboard />} />
            <Route path="/" element={<Navigate to="/case/create" replace />} />
        </Routes>
    );
};

export default App;
