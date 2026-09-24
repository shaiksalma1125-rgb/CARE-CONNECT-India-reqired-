import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function useSpeechRecognition(onResultCallback: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setIsSupported(hasSpeech);
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English default, also captures common Indian district & medical terms

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResultCallback(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error', event.error);
        if (event.error !== 'no-speech') {
          setError(`Microphone note: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  }, [onResultCallback]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening
  };
}
