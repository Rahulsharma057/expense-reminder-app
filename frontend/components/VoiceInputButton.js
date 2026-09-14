"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicNoneIcon from "@mui/icons-material/MicNone";
import { toast } from "react-toastify";

// Uses the browser's built-in SpeechRecognition API — 100% free, no API key.
// Works in Chrome / Edge; silently hides itself on unsupported browsers.
export default function VoiceInputButton({ onResult, lang = "en-IN" }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) onResult(transcript);
    };

    recognition.onerror = () => {
      toast.error("Voice input failed. Try again.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!supported) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // start() throws if already running — ignore.
      }
    }
  };

  return (
    <Tooltip title={listening ? "Listening... tap to stop" : "Speak to fill this field"}>
      <IconButton
        size="small"
        onClick={toggleListening}
        sx={{
          color: listening ? "error.main" : "primary.main",
          animation: listening ? "pulse 1.2s infinite" : "none",
          "@keyframes pulse": {
            "0%": { opacity: 1 },
            "50%": { opacity: 0.4 },
            "100%": { opacity: 1 },
          },
        }}
      >
        {listening ? <MicIcon fontSize="small" /> : <MicNoneIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}