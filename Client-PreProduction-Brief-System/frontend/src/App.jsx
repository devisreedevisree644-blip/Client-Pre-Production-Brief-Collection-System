import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

// Global Stylesheet Imports
import './styles/variables.css';
import './styles/global.css';
import './styles/typography.css';
import './styles/forms.css';
import './styles/tables.css';
import './styles/responsive.css';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
