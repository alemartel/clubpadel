import { Check, ClipboardList, DollarSign, X, Smartphone, Users, Building2, Mail, Phone, Trophy, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { LigasIcon, AmericanosIcon, TorneosIcon, PlayoffsIcon } from "@/assets/icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function Landing() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Navigation Bar */}
      <nav className="bg-[#0F172A] text-white px-4 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MP</span>
              </div>
              <span className="font-bold text-xl" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                MyPadelCenter
              </span>
            </div>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="hover:text-[#10B981] transition-colors">Inicio</a>
            <a href="#caracteristicas" className="hover:text-[#10B981] transition-colors">Todo en uno</a>
            <a href="#prensa-generativa" className="hover:text-[#10B981] transition-colors">Prensa generativa</a>
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
      <section id="inicio" className="relative w-full h-[600px] overflow-hidden">
        {/* Banner Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/banner003.png)',
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        
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
              <p className="text-xl text-white/90 mb-8 drop-shadow-md" style={{ fontFamily: 'Inter, sans-serif' }}>
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
      <section id="caracteristicas" className="py-[60px] bg-white">
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
      <section id="prensa-generativa" className="py-[60px] bg-[#F1F5F9]">
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
                <div className="aspect-[3/4] bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-[12px] flex items-center justify-center">
                  <Smartphone className="w-16 h-16 text-[#10B981]" />
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
                  "Contenido optimizado para redes sociales",
                  "Video-resumen de la jornada"
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
                <div className="aspect-video bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-[12px] flex items-center justify-center">
                  {/* Image will be placed here */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="py-[60px] bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Contacto
          </h2>
          <div className="max-w-2xl mx-auto space-y-8">
            <p className="text-white text-lg text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              ¿Listo para transformar la gestión de tu club de pádel? Contáctanos y descubre cómo podemos ayudarte.
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Privacidad / MyPadelCenter
              </span>
              <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Términos e información
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
