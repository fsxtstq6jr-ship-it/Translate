import { GoogleGenAI, Type, Modality } from "@google/genai";

export interface TranslationResult {
  translatedText: string;
  detectedLanguageCode: string;
}

export const languages = [
  { code: "en", name: "İngilizce", flag: "🇬🇧" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "ar", name: "Arapça", flag: "🇸🇦" },
  { code: "it", name: "İtalyanca", flag: "🇮🇹" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
];

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  if (!text.trim()) return { translatedText: "", detectedLanguageCode: sourceLang };

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to ${targetLang}. 
      If the text is not in ${sourceLang}, detect the actual language and translate from that language instead.
      Provide the result in JSON format with 'translatedText' and 'detectedLanguageCode' (ISO 639-1).
      Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedLanguageCode: { type: Type.STRING },
          },
          required: ["translatedText", "detectedLanguageCode"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      translatedText: result.translatedText || "",
      detectedLanguageCode: result.detectedLanguageCode || sourceLang,
    };
  } catch (error) {
    console.error("Translation error:", error);
    return { translatedText: "Çeviri hatası oluştu.", detectedLanguageCode: sourceLang };
  }
}

export async function speakText(text: string, langCode: string): Promise<boolean> {
  if (!text.trim()) return false;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }, // Female voice
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = part?.inlineData?.data;
    
    if (base64Audio) {
      const audioData = base64ToArrayBuffer(base64Audio);
      await playPcmAudio(audioData, 24000);
      return true;
    }
    
    console.error("Gemini TTS: No audio data in response");
    return false;
  } catch (error) {
    console.error("Gemini TTS API Error:", error);
    return false;
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function playPcmAudio(buffer: ArrayBuffer, sampleRate: number) {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Gemini TTS returns 16-bit PCM. We need to convert it to Float32 for Web Audio API.
  const int16Array = new Int16Array(buffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Array);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  
  return new Promise<void>((resolve) => {
    source.onended = () => {
      audioCtx.close();
      resolve();
    };
    source.start();
  });
}
