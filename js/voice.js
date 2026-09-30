/**
 * =========================================================================
 * AI Timesheet Assistant - Voice Input / Speech Recognition Service
 * =========================================================================
 */

class VoiceService {
  constructor(options = {}) {
    this.options = {
      lang: "en-US",
      continuous: true,
      interimResults: true,
      ...options
    };

    this.recognition = null;
    this.isListening = false;
    this.finalTranscript = "";

    this.onStart = options.onStart || (() => {});
    this.onResult = options.onResult || (() => {});
    this.onError = options.onError || (() => {});
    this.onEnd = options.onEnd || (() => {});

    this.init();
  }

  /**
   * Check if speech recognition is supported in current browser
   */
  static isSupported() {
    return typeof window !== "undefined" && 
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize speech recognition instance
   */
  init() {
    if (!VoiceService.isSupported()) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.options.lang;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += (this.finalTranscript ? " " : "") + transcriptPart.trim();
        } else {
          interimTranscript += transcriptPart;
        }
      }

      this.onResult({
        final: this.finalTranscript,
        interim: interimTranscript,
        current: this.finalTranscript + (interimTranscript ? " " + interimTranscript : "")
      });
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      let friendlyMessage = "Speech recognition error.";

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          friendlyMessage = "Microphone permission was denied. Please allow microphone access in your browser address bar.";
          break;
        case "no-speech":
          friendlyMessage = "No speech was detected. Please try tapping the microphone and speaking again.";
          break;
        case "network":
          friendlyMessage = "Speech recognition network error. Check your connection or type your work description.";
          break;
        default:
          friendlyMessage = `Speech error: ${event.error}. You can also type your work directly.`;
      }

      this.onError(friendlyMessage, event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd(this.finalTranscript);
    };
  }

  /**
   * Start listening to voice input
   */
  start(initialText = "") {
    if (!this.recognition) {
      this.init();
    }

    if (!this.recognition) {
      this.onError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your entry.");
      return false;
    }

    if (this.isListening) {
      return true;
    }

    this.finalTranscript = initialText ? initialText.trim() : "";
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      this.onError("Could not start microphone: " + e.message);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn("Error while stopping speech recognition:", e);
      }
    }
    this.isListening = false;
  }

  /**
   * Toggle speech recognition
   */
  toggle(currentText = "") {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start(currentText);
    }
  }

  /**
   * Reset the transcript buffer
   */
  reset() {
    this.finalTranscript = "";
  }
}

if (typeof window !== "undefined") {
  window.VoiceService = VoiceService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { VoiceService };
}
