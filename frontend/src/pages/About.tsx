import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18nStore } from '../store/i18nStore';

export default function About() {
  const { t } = useI18nStore();

  return (
    <div className="min-h-screen bg-surface p-8">
      {/* Top Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5 h-20 flex items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <img src="/EscudoFino.png" alt="Lancelot Logo" className="h-10 w-auto" />
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            LANCELOT <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">About</span>
          </span>
        </Link>
        <Link
            to="/"
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors"
        >
            <ArrowLeft size={16} />
            {t('back_to_hub')}
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-32 pb-24">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            {/* About Lancelot Section */}
            <section className="glass-panel border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
                    {t('about_title')}
                </h1>
                <p className="text-lg text-text-muted leading-relaxed max-w-3xl">
                    {t('about_description')}
                </p>
            </section>

            {/* The Creator Section */}
            <section className="glass-panel border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                 {/* Decorative glow */}
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C3A563]/10 rounded-full blur-[100px] pointer-events-none" />
                 
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                    {t('about_creator_title')}
                </h2>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-[#C3A563] flex-shrink-0 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary/20">
                        LC
                    </div>
                    <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                        {t('about_creator_description')}
                    </p>
                </div>
            </section>
        </motion.div>
      </main>
    </div>
  );
}
