import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'white' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>InterimPro</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            Se connecter
          </Link>
          <Link href="/auth/login" style={{ padding: '8px 20px', borderRadius: '8px', background: 'var(--accent)', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Commencer gratuitement
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 40px 80px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', marginBottom: '32px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }}></div>
          <span style={{ fontSize: '13px', color: '#06b6d4', fontWeight: 500 }}>Conçu pour les infirmiers intérimaires</span>
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-1px' }}>
          Gérez vos missions<br />
          <span style={{ color: 'var(--accent)' }}>d&apos;intérim médical</span><br />
          simplement
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
          Suivez vos revenus, gérez vos établissements, importez vos missions depuis Google Agenda. Tout en un seul endroit.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/login" style={{ padding: '16px 36px', borderRadius: '12px', background: 'var(--accent)', color: 'white', textDecoration: 'none', fontSize: '16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Commencer gratuitement
            <svg viewBox="0 0 20 20" style={{ width: '18px', height: '18px', fill: 'currentColor' }}>
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
            </svg>
          </Link>
          <Link href="/auth/login" style={{ padding: '16px 36px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '16px', fontWeight: 500 }}>
            Se connecter
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px', display: 'flex', justifyContent: 'center', gap: '80px', flexWrap: 'wrap' }}>
        {[
          { value: '100%', label: 'Gratuit' },
          { value: 'Auto', label: 'Import Google Agenda' },
          { value: '24/7', label: 'Accès en ligne' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent)' }}>{stat.value}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px' }}>Tout ce dont vous avez besoin</h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Une seule application pour gérer toute votre carrière d&apos;intérimaire</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {[
            { icon: '📅', title: 'Import Google Agenda', desc: 'Importez automatiquement vos missions depuis votre Google Agenda. Matching intelligent avec vos établissements.' },
            { icon: '💰', title: 'Suivi des revenus', desc: 'Visualisez vos revenus mensuels, IFM, ICCP et comparez avec votre objectif. Export fiscal annuel.' },
            { icon: '🏥', title: 'Gestion des établissements', desc: 'Gérez tous vos établissements avec leurs taux horaires, créneaux et contacts en un seul endroit.' },
            { icon: '🔔', title: 'Alertes intelligentes', desc: 'Soyez alerté si un contrat n&apos;est pas signé avant votre mission ou si une fiche de paie est manquante.' },
            { icon: '📊', title: 'Analyses détaillées', desc: 'Graphiques et statistiques pour suivre votre activité, vos établissements préférés et votre progression.' },
            { icon: '🔄', title: 'Synchronisation temps réel', desc: 'Synchronisation automatique toutes les 15 minutes avec Google Agenda pour ne rien manquer.' },
          ].map((feature, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ margin: '0 40px 100px', borderRadius: '24px', background: 'linear-gradient(135deg, #0e7490 0%, #0f172a 100%)', padding: '80px 40px', textAlign: 'center', border: '1px solid rgba(6,182,212,0.2)' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px', color: 'white' }}>
          Prêt à simplifier votre gestion ?
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', marginBottom: '40px' }}>
          Rejoignez InterimPro gratuitement et prenez le contrôle de votre carrière
        </p>
        <Link href="/auth/login" style={{ padding: '16px 40px', borderRadius: '12px', background: 'white', color: '#0e7490', textDecoration: 'none', fontSize: '16px', fontWeight: 700 }}>
          Créer mon compte gratuit
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'white' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>InterimPro</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>© 2026 InterimPro — Tous droits réservés</p>
      </footer>
    </div>
  )
}
