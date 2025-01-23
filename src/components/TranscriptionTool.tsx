import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { TranscriptionSegment, Language, TranscriptionStatus } from '../types';

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ja-JP', name: 'Japanese' },
];

export default function TranscriptionTool() {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  const startRecognition = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        throw new Error('Speech recognition is not supported in this browser');
      }
      
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage.code;

      recognition.onstart = () => {
        setStatus('recording');
        setErrorMessage('');
        isListeningRef.current = true;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = Array.from(event.results);
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript;
            const confidence = result[0].confidence;
            
            setTranscription(prev => [...prev, {
              text: transcript.trim(),
              timestamp: Date.now(),
              confidence
            }]);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          // Don't show error for no-speech, just restart
          restartRecognition(recognition);
          return;
        }

        let message = '';
        switch (event.error) {
          case 'audio-capture':
            message = 'No microphone was found. Ensure it is plugged in and allowed.';
            break;
          case 'not-allowed':
            message = 'Microphone permission was denied. Please allow access to continue.';
            break;
          case 'network':
            message = 'Network error occurred. Please check your connection.';
            break;
          default:
            message = 'An error occurred with speech recognition.';
        }
        
        setErrorMessage(message);
        setStatus('error');
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        // Automatically restart if we're still supposed to be recording
        if (isListeningRef.current) {
          restartRecognition(recognition);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setErrorMessage('Speech recognition is not supported in this browser.');
      setStatus('error');
    }
  }, [selectedLanguage]);

  const restartRecognition = (recognition: SpeechRecognition) => {
    if (isListeningRef.current) {
      try {
        recognition.start();
      } catch (error) {
        // If we can't restart immediately, wait a bit
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart recognition:', error);
          }
        }, 100);
      }
    }
  };

  const stopRecognition = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const toggleRecording = () => {
    if (status === 'idle' || status === 'error') {
      startRecognition();
    } else if (status === 'recording') {
      stopRecognition();
    }
  };

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Real-time Transcription</h2>
          <select
            className="px-4 py-2 border rounded-lg bg-white text-gray-800"
            value={selectedLanguage.code}
            onChange={(e) => {
              const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
              if (lang) {
                setSelectedLanguage(lang);
                if (status === 'recording') {
                  stopRecognition();
                  startRecognition();
                }
              }
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-colors ${
              status === 'recording'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {status === 'recording' ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {status === 'recording' && !errorMessage && (
          <div className="text-center mb-4 text-green-600 animate-pulse">
            Listening... Speak now
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
          {transcription.length === 0 ? (
            <p className="text-gray-500 text-center">Start speaking to see transcription</p>
          ) : (
            <div className="space-y-4">
              {transcription.map((segment, index) => (
                <div
                  key={`${segment.timestamp}-${index}`}
                  className="bg-white p-4 rounded-lg shadow"
                >
                  <p className="text-gray-800">{segment.text}</p>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>
                      {new Date(segment.timestamp).toLocaleTimeString()}
                    </span>
                    <span>
                      Confidence: {Math.round(segment.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}