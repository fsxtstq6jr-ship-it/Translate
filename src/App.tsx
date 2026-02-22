import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Languages, 
  ArrowRightLeft, 
  Volume2, 
  Copy, 
  Check, 
  Moon, 
  Sun, 
  ChevronDown,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { languages, translateText, speakText } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState('tr');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showSourceLangs, setShowSourceLangs] = useState(false);
  const [showTargetLangs, setShowTargetLangs] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Force dark mode class on root
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Translation Logic
  const handleTranslate = useCallback(async (text: string, sLang: string, tLang: string) => {
    if (!text.trim()) {
      setTargetText('');
      return;
    }

    setIsLoading(true);
    const result = await translateText(text, sLang, tLang);
    
    // Auto-detect language logic
    if (result.detectedLanguageCode && result.detectedLanguageCode !== sLang) {
      const foundLang = languages.find(l => l.code === result.detectedLanguageCode);
      if (foundLang) {
        setSourceLang(foundLang.code);
      }
    }
    
    setTargetText(result.translatedText);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (sourceText) {
      debounceTimer.current = setTimeout(() => {
        handleTranslate(sourceText, sourceLang, targetLang);
      }, 300); // 300ms debounce for a snappier "real-time" feel
    } else {
      setTargetText('');
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [sourceText, sourceLang, targetLang, handleTranslate]);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = async (text: string, lang: string) => {
    if (!text.trim() || isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const success = await speakText(text, lang);
      if (!success) {
        console.warn("TTS playback failed");
      }
      setIsSpeaking(false);
    } catch (error) {
      console.error("Speak error:", error);
      setIsSpeaking(false);
    }
  };

  const getLangName = (code: string) => languages.find(l => l.code === code)?.name || code;
  const getLangFlag = (code: string) => languages.find(l => l.code === code)?.flag || '';

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Languages className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-black dark:text-white">
              TRanslate<span className="text-indigo-600">🇹🇷</span>
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            {/* Theme toggle removed as per request */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 md:py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Source Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="relative">
                <button 
                  onClick={() => setShowSourceLangs(!showSourceLangs)}
                  className="lang-select"
                >
                  <span>{getLangFlag(sourceLang)}</span>
                  <span>{getLangName(sourceLang)}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showSourceLangs && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showSourceLangs && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 glass-card overflow-hidden z-40"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSourceLang(lang.code);
                            setShowSourceLangs(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                        >
                          <span>{lang.flag}</span>
                          <span className="text-sm">{lang.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button 
                onClick={swapLanguages}
                className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="glass-card flex flex-col min-h-[300px]">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Metin girin..."
                className="input-area text-black dark:text-white placeholder:text-slate-400"
                autoFocus
              />
              <div className="mt-auto p-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSpeak(sourceText, sourceLang)}
                    disabled={!sourceText || isSpeaking}
                    className={cn(
                      "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors disabled:opacity-30",
                      isSpeaking && "text-indigo-500 animate-pulse"
                    )}
                  >
                    {isSpeaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {sourceText.length} karakter
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Swap Button */}
          <div className="hidden lg:flex items-center justify-center -mx-3 z-10">
            <button 
              onClick={swapLanguages}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xl hover:scale-110 transition-transform text-indigo-600"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Target Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="relative">
                <button 
                  onClick={() => setShowTargetLangs(!showTargetLangs)}
                  className="lang-select"
                >
                  <span>{getLangFlag(targetLang)}</span>
                  <span>{getLangName(targetLang)}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showTargetLangs && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showTargetLangs && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 glass-card overflow-hidden z-40"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setTargetLang(lang.code);
                            setShowTargetLangs(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                        >
                          <span>{lang.flag}</span>
                          <span className="text-sm">{lang.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="glass-card bg-slate-50/50 dark:bg-slate-900/30 flex flex-col min-h-[300px]">
              <div className="input-area overflow-auto text-black dark:text-white">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 italic text-lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Çevriliyor...
                  </div>
                ) : targetText ? (
                  <span className="whitespace-pre-wrap">{targetText}</span>
                ) : (
                  <span className="text-slate-400">Çeviri burada görünecek</span>
                )}
              </div>
              <div className="mt-auto p-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSpeak(targetText, targetLang)}
                    disabled={!targetText || isSpeaking}
                    className={cn(
                      "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors disabled:opacity-30",
                      isSpeaking && "text-indigo-500 animate-pulse"
                    )}
                  >
                    {isSpeaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={handleCopy}
                    disabled={!targetText}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors disabled:opacity-30"
                  >
                    {isCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {targetText && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Doğrulandı
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Akıllı Algılama</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Yazdığınız dili anında tanır ve doğru dil çiftini otomatik olarak ayarlar.
            </p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Languages className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Doğal Çeviri</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Sadece kelimeleri değil, günlük konuşma dilini ve deyimleri de doğru çevirir.
            </p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Seslendirme</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Yapay zeka destekli seslendirme ile telaffuzları anında dinleyin.
            </p>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-slate-400/50 font-medium tracking-wider">
          <span className="font-bold text-slate-500 dark:text-slate-400">ercanulger</span> tarafından geliştirildiği
        </p>
      </footer>
    </div>
  );
}
