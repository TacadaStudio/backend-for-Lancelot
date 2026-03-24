import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, Zap, WifiOff } from 'lucide-react';
import { useI18nStore } from '../store/i18nStore';

export default function MainDashboard() {
    const navigate = useNavigate();
    const { t, lang, setLang } = useI18nStore();

    return (
        <div className="min-h-screen bg-background text-text-main flex flex-col relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

            {/* Navigation Bar */}
            <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-6 w-full">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <img src="/EscudoFino.png" alt="Lancelot Logo" className="h-8 w-auto drop-shadow-md" />
                    <span className="text-xl font-extrabold tracking-tight text-white">
                        Lancelot<span className="text-primary">.net</span>
                    </span>
                </div>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
                    <button onClick={() => navigate('/')} className="hover:text-white transition-colors">{t('nav_home')}</button>
                    <button onClick={() => navigate('/about')} className="hover:text-white transition-colors">{t('nav_about')}</button>
                    <a href="#" className="hover:text-white transition-colors">{t('nav_contact')}</a>
                    
                    {/* Language Switcher integrated in nav */}
                    <div className="flex items-center gap-2 ml-4">
                        <button 
                            onClick={() => setLang('es')} 
                            className={`px-2 py-1 rounded transition-colors ${lang === 'es' ? 'text-white' : 'hover:text-white'}`}
                        >
                            ES
                        </button>
                        <span className="text-white/20">|</span>
                        <button 
                            onClick={() => setLang('en')} 
                            className={`px-2 py-1 rounded transition-colors ${lang === 'en' ? 'text-white' : 'hover:text-white'}`}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center pt-20 md:pt-32 pb-16 px-6 text-center max-w-5xl mx-auto w-full">
                
                {/* Headline */}
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.2] text-white"
                >
                    {t('hero_title')}{" "}
                    <span className="relative inline-flex items-center justify-center px-6 py-2 rounded-[2.5rem] border border-primary/40 bg-primary/10 mx-2 shadow-[0_0_30px_rgba(195,165,99,0.15)] align-middle">
                        <span className="text-primary mr-3 text-4xl md:text-6xl">{t('hero_badge')}</span>
                        <Lock className="text-primary h-8 w-8 md:h-10 md:w-10" strokeWidth={2.5} />
                    </span>{" "}
                    {t('hero_subtitle')}
                </motion.h1>

                {/* Feature Badges */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex justify-center gap-4 mb-16 flex-wrap"
                >
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-text-muted">
                        <ShieldCheck size={16} className="text-primary" />
                        {t('feat_privacy')}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-text-muted">
                        <Zap size={16} className="text-primary" />
                        {t('feat_precision')}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-text-muted">
                        <WifiOff size={16} className="text-primary" />
                        {t('feat_local')}
                    </div>
                </motion.div>

                {/* CTA Button */}
                <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/process')}
                    className="flex items-center gap-4 bg-primary hover:bg-primary/90 text-background rounded-full pl-8 pr-2 py-2 text-lg font-bold tracking-wide transition-all shadow-[0_0_40px_rgba(195,165,99,0.4)]"
                >
                    {t('cta_start')}
                    <div className="bg-background text-primary p-2 rounded-full">
                        <ArrowRight size={20} strokeWidth={3} />
                    </div>
                </motion.button>

                {/* Trusted By Section */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="mt-24 md:mt-32 pt-12 flex flex-col items-center opacity-70"
                >
                    <p className="text-sm font-medium text-text-muted mb-8">{t('trusted_by')}</p>
                    <div className="flex justify-center items-center gap-8 md:gap-12 flex-wrap text-white/50 grayscale">
                        <div className="font-extrabold text-2xl tracking-tighter">COBRA</div>
                        <div className="font-bold text-xl tracking-widest uppercase">Elecnor</div>
                        <div className="font-bold text-2xl tracking-tighter text-white/70">acciona</div>
                        <div className="font-semibold text-xl tracking-wide italic">Iberdrola</div>
                        <div className="font-extrabold text-xl tracking-widest uppercase">TYPSA</div>
                    </div>
                </motion.div>

                {/* Bottom Link */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="mt-auto pt-20 pb-8"
                >
                    <h2 className="text-2xl font-bold text-white">
                        {t('why_choose')}{" "}
                        <span 
                            onClick={() => navigate('/about')}
                            className="text-primary border-b-2 border-primary/50 pb-1 cursor-pointer hover:text-primary transition-colors hover:border-primary"
                        >
                            Lancelot.net?
                        </span>
                    </h2>
                </motion.div>
            </main>
        </div>
    );
}
