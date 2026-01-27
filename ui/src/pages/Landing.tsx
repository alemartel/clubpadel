import { Check, ClipboardList, DollarSign, X, Smartphone, Users, Building2, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Navigation Bar */}
      <nav className="bg-[#0F172A] text-white px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              MyPadelCenter
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#inicio" className="hover:text-[#10B981] transition-colors">Inicio</a>
            <a href="#caracteristicas" className="hover:text-[#10B981] transition-colors">Características</a>
            <a href="#para-quien" className="hover:text-[#10B981] transition-colors">Para Quién</a>
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
                Adiós al caos de WhatsApp en tu club de pádel
              </h1>
              <p className="text-xl text-white/90 mb-8 drop-shadow-md" style={{ fontFamily: 'Inter, sans-serif' }}>
                Automatiza reservas, pagos y organización. Recupera el control.
              </p>
              <Link
                to="/themirrorclub"
                className="inline-block bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-8 py-4 rounded-[14px] font-semibold text-lg hover:opacity-90 transition-opacity shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Solicitar Demo Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* El Problema Section */}
      <section id="caracteristicas" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold text-[#0F172A] mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            El Problema
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mb-6">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Gestión manual
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Reservas y organización manuales que consumen tiempo y generan errores constantes.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mb-6">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Pagos sin control
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Pagos manuales y automáticos sin seguimiento adecuado, generando descontrol financiero.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mb-6">
                <X className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Pistas vacías
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Pistas sin optimizar que permanecen vacías por falta de organización y atractivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La Solución Section */}
      <section className="py-20 bg-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-white p-6 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] mb-8">
                <div className="aspect-[9/16] bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-[12px] flex items-center justify-center">
                  <Smartphone className="w-24 h-24 text-[#10B981]" />
                </div>
              </div>
            </div>
            <div>
              <h2 
                className="text-4xl font-bold text-[#0F172A] mb-6"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                La Solución
              </h2>
              <p className="text-xl text-[#334155] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                Automatiza reservas, pagos y organización. Recupera el control.
              </p>
              <div className="space-y-4">
                {[
                  "Gestión manual mejorada",
                  "Reservas en el club",
                  "Pagos claros y controlados",
                  "Reservas estimadas",
                  "Reserva flexible de pistas",
                  "Ligas sociales",
                  "Uso optimizado de pistas"
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
            </div>
          </div>
        </div>
      </section>

      {/* Para quién es esto Section */}
      <section id="para-quien" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold text-[#0F172A] mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Para quién es esto
          </h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] text-center">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Clubes Privados
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Para clubes privados que organizan partidos y necesitan una gestión profesional.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] text-center">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Ligas Sociales
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Para ligas sociales que buscan organizar competiciones de manera eficiente.
              </p>
            </div>
            <div className="bg-[#F1F5F9] p-8 rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] text-center">
              <div className="w-16 h-16 bg-[#334155] rounded-[12px] flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-4"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Entidades Públicas
              </h3>
              <p className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Para entidades públicas que requieren servicios profesionales de gestión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className="py-20 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 
            className="text-4xl font-bold mb-12 text-center"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Contacto
          </h2>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-[#334155] mb-8 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                ¿Listo para transformar la gestión de tu club de pádel? Contáctanos y descubre cómo podemos ayudarte.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#10B981]" />
                  <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    +34 696 180 000
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#10B981]" />
                  <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    +34 637 009 800
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#10B981]" />
                  <span className="text-[#334155]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    info@mypadelcenter.com
                  </span>
                </div>
              </div>
            </div>
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
