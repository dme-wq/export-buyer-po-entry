import React from 'react';
import Form from './components/Form';
import { Package } from 'lucide-react';

function App() {
  return (
    <>
      <header className="app-header animate-slide-up">
        <div className="app-logo">
          <Package color="white" size={24} />
        </div>
        <h1>Order to Dispatch FMS</h1>
        <p>Premium WebForm for Buyer PO Entry</p>
      </header>
      
      <main className="container animate-slide-up delay-1">
        <div className="glass-panel">
          <Form />
        </div>
      </main>
    </>
  );
}

export default App;
