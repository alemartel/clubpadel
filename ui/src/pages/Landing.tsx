import { Check, ClipboardList, DollarSign, X, Smartphone, Users, Building2, Mail, Phone, Trophy, Menu, Instagram, Youtube, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { LigasIcon, AmericanosIcon, TorneosIcon, PlayoffsIcon } from "@/assets/icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Set video properties - not muted
    video.muted = false;
    video.preload = "auto";

    // Handle video play/pause events
    const handlePlay = () => {
      setIsPlaying(true);
      setShowPlayButton(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowPlayButton(true);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isPlaying) {
            // Resume playing if video was already playing
            video.play().catch((error) => {
              console.log("Video play error:", error);
            });
          } else if (!entry.isIntersecting) {
            video.pause();
          }
        });
      },
      {
        threshold: 0.25, // Play when at least 25% of the video is visible
        rootMargin: "0px",
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [isPlaying]);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video) {
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <video
        ref={videoRef}
        src="/VideoDemoLanding4_5.mp4"
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      {showPlayButton && (
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
          aria-label="Play video"
        >
          <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:bg-white transition-colors">
            <Play className="w-10 h-10 text-[#10B981] ml-1" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
}

export function Landing() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Navigation Bar */}
      <nav className="bg-[#EFF0F6] text-[#0F172A] px-4 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-black/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-[#0F172A]" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="/Icon_transparent.png" 
                alt="MyPadelCenter Icon" 
                className="h-8 w-8 object-contain"
              />
              <img 
                src="/Name_lightwhiteback_mini.png" 
                alt="MyPadelCenter" 
                className="h-6 object-contain"
              />
            </div>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-[#0F172A] hover:text-[#10B981] transition-colors">Inicio</a>
            <a href="#caracteristicas" className="text-[#0F172A] hover:text-[#10B981] transition-colors">Todo en uno</a>
            <a href="#prensa-generativa" className="text-[#0F172A] hover:text-[#10B981] transition-colors">Prensa generativa</a>
            <a
              href="#contacto"
              className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-6 py-2 rounded-[12px] font-semibold hover:opacity-90 transition-opacity shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Solicitar Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="bg-[#0F172A] text-white w-[280px]">
          <SheetHeader className="px-4">
            <SheetTitle className="text-white">Menú</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-6 px-4">
            <a
              href="#inicio"
              onClick={handleNavClick}
              className="text-lg hover:text-[#10B981] transition-colors"
            >
              Inicio
            </a>
            <a
              href="#caracteristicas"
              onClick={handleNavClick}
              className="text-lg hover:text-[#10B981] transition-colors"
            >
              Todo en uno
            </a>
            <a
              href="#prensa-generativa"
              onClick={handleNavClick}
              className="text-lg hover:text-[#10B981] transition-colors"
            >
              Prensa generativa
            </a>
            <a
              href="#contacto"
              onClick={handleNavClick}
              className="text-lg hover:text-[#10B981] transition-colors"
            >
              Contacto
            </a>
            <a
              href="#contacto"
              onClick={handleNavClick}
              className="bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-6 py-3 rounded-[12px] font-semibold text-center hover:opacity-90 transition-opacity shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Solicitar Demo
            </a>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Hero Section with Banner */}
      <section id="inicio" className="relative w-full h-[600px] overflow-hidden scroll-mt-12">
        {/* Banner Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/landing.jpg)',
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        
        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-8 w-full">
            <div className="max-w-2xl">
              <h1 
                className="text-5xl font-bold mb-6 leading-tight text-white drop-shadow-lg"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Llevamos el pádel al siguiente nivel
              </h1>
              <p className="text-xl text-white mb-8 drop-shadow-md" style={{ fontFamily: 'Inter, sans-serif' }}>
                Automatización, control y una experiencia que marca la diferencia.
              </p>
              <a
                href="#contacto"
                className="inline-block bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-8 py-4 rounded-[14px] font-semibold text-lg hover:opacity-90 transition-opacity shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Solicitar Demo Gratis
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Todo en uno Section */}
      <section id="caracteristicas" className="py-[60px] bg-white scroll-mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold text-[#0F172A] mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Todo en uno
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#334155] rounded-[8px] flex items-center justify-center flex-shrink-0">
                  <LigasIcon className="text-white" size={20} />
                </div>
                <h3 
                  className="text-2xl font-bold text-[#0F172A]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Ligas
                </h3>
              </div>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Calendarios automáticos y control total de la competición durante toda la temporada.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#334155] rounded-[8px] flex items-center justify-center flex-shrink-0">
                  <AmericanosIcon className="text-white" size={20} />
                </div>
                <h3 
                  className="text-2xl font-bold text-[#0F172A]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Americanos
                </h3>
              </div>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Eventos rápidos, flexibles y muy participativos con rotaciones automáticas y una experiencia fluida.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#334155] rounded-[8px] flex items-center justify-center flex-shrink-0">
                  <TorneosIcon className="text-white" size={20} />
                </div>
                <h3 
                  className="text-2xl font-bold text-[#0F172A]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Torneos
                </h3>
              </div>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Gestión completa con cuadros automatizados, seguimiento de partidos en tiempo real.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#334155] rounded-[8px] flex items-center justify-center flex-shrink-0">
                  <PlayoffsIcon className="text-white" size={20} />
                </div>
                <h3 
                  className="text-2xl font-bold text-[#0F172A]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Playoffs
                </h3>
              </div>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
              El cierre perfecto.
              Fases finales automáticas, cruces claros y máxima emoción hasta el último partido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prensa generativa con Inteligencia Artificial Section */}
      <section id="prensa-generativa" className="py-[60px] bg-[#F1F5F9] scroll-mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold text-[#0F172A] mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Prensa generativa con Inteligencia Artificial
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="order-2 md:order-1">
              <div className="bg-white p-6 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] mb-8">
                <div className="aspect-[4/5] bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-[12px] overflow-hidden">
                  <VideoPlayer />
                </div>
              </div>
            </div>
            <div className="order-3 md:order-2 md:mt-8">
              <p className="text-xl text-[#334155] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
              Convierte cada partido en contenido de valor para jugadores y redes sociales.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  "Crónicas automáticas de partidos y jornadas",
                  "Titulares y resúmenes generados por IA",
                  "Video-resumen de la jornada",
                  "Contenido optimizado para redes sociales"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
              {/* Space for image below text content */}
              <div className="bg-white p-6 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
                <div className="aspect-video bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-[12px] overflow-hidden cursor-pointer" onClick={() => setImageModalOpen(true)}>
                  <img 
                    src="/DemoRRSS.png" 
                    alt="Demo de redes sociales" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Image Modal */}
              <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                <DialogPortal>
                  <DialogOverlay className="bg-black/80" />
                  <DialogContent className="!max-w-[90vw] !max-h-[90vh] !w-auto !h-auto p-0 bg-transparent border-none [&_button]:text-white [&_button]:hover:text-white [&_svg]:text-white">
                    <div className="relative flex items-center justify-center">
                      <img 
                        src="/DemoRRSS.png" 
                        alt="Demo de redes sociales" 
                        className="max-w-[90vw] max-h-[90vh] w-auto h-auto rounded-lg object-contain"
                      />
                    </div>
                  </DialogContent>
                </DialogPortal>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="py-[60px] bg-[#0F172A] text-white scroll-mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Contacto
          </h2>
          <div className="max-w-2xl mx-auto space-y-8">
            <p className="text-white text-lg text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            ¿Te atreves a pasar al siguiente nivel? Contáctanos y descubre cómo podemos ayudarte.
            </p>
            <div className="bg-white/5 p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <form className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Nombre"
                    className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Mensaje"
                    rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <Link
                  to="/themirrorclub"
                  className="block w-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-6 py-3 rounded-[12px] font-semibold text-center hover:opacity-90 transition-opacity shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Solicitar Demo
                </Link>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-8">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Privacidad / MyPadelCenter
              </span>
              <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Términos e información
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/mypadelcenter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#334155] hover:text-[#10B981] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@mypadelcenter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#334155] hover:text-[#10B981] transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@MyPadelCenter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#334155] hover:text-[#10B981] transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
