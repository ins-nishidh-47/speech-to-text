import React from 'react';
import TranscriptionTool from './components/TranscriptionTool';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Real-time Speech Transcription
        </h1>
        <TranscriptionTool />
      </div>
    </div>
  );
}

export default App;