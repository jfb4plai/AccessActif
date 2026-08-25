import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { input, label, btn, btnGhost, card, COLORS, BASE, SMALL } from '../lib/ui'

function LoginForm({ onForgot, onRequestAccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(
      err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : err.message
    )
    setLoading(false)
  }

  return (
    <>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 14 }}>
          <label style={label} htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={label} htmlFor="login-password">Mot de passe</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
        </div>
        <p style={{ marginTop: 0, marginBottom: 18 }}>
          <button type="button" onClick={() => onForgot(email)}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: SMALL, color: COLORS.muted, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
            Mot de passe oublié ?
          </button>
        </p>
        {error && (
          <p role="alert" style={{ fontSize: BASE, color: COLORS.danger, marginBottom: 12 }}>{error}</p>
        )}
        <button type="submit" disabled={loading}
          style={{ ...btn, width: '100%', background: loading ? COLORS.muted : COLORS.teal }}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 20, marginBottom: 8 }}>
        Les enseignants n'ont pas de compte : ils reçoivent un lien personnel par email.
      </p>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 0 }}>
        Pas encore de compte ?{' '}
        <button type="button" onClick={onRequestAccess}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: SMALL, color: COLORS.teal, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
          Demander un accès
        </button>
      </p>
    </>
  )
}

const ACCESS_REQUEST_EMAIL = 'jeanfrancois.beguin@ens.ecl.be'

// Ordre alphabétique — volontaire, pour ne pas hiérarchiser les PO entre eux.
const PO_LIST = [
  'Beyne-Heusay',
  'Chaudfontaine',
  'Grâce-Hollogne',
  'Liège',
  'Neupré',
  'Seraing',
  'Sprimont',
  'Trooz',
]

function RequestChoice({ onChoose, onBack }) {
  return (
    <div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 20 }}>
        Vous êtes…
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
        <button type="button" onClick={() => onChoose('plai')}
          style={{ ...btn, width: '100%', background: COLORS.teal }}>
          Membre du PLAI (référent·e d'école)
        </button>
        <button type="button" onClick={() => onChoose('school')}
          style={{ ...btn, width: '100%', background: COLORS.teal }}>
          Représentant·e d'une école
        </button>
      </div>
      <button type="button" onClick={onBack} style={btnGhost}>Retour</button>
    </div>
  )
}

function AccessRequestForm({ onBack }) {
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')

  const mailtoHref = () => {
    const subject = `Demande d'accès AccèsActif — membre PLAI${name ? ` — ${name}` : ''}`
    const body = [
      `Nom : ${name || '(à compléter)'}`,
      `École / Pôle : ${school || '(à compléter)'}`,
      '',
      "Merci de créer mon compte membre PLAI sur AccèsActif.",
    ].join('\n')
    return `mailto:${ACCESS_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 16 }}>
        Complétez ces informations puis envoyez le message : votre client mail s'ouvrira avec le
        message pré-rempli, envoyé depuis votre propre adresse. Le coordinateur du Pôle valide
        l'adresse et crée votre compte.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={label} htmlFor="req-name">Votre nom</label>
        <input id="req-name" type="text" value={name}
          onChange={e => setName(e.target.value)} style={{ ...input, marginBottom: 0 }}
          placeholder="Ex : Marie Dupont" />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={label} htmlFor="req-school">École / Pôle territorial</label>
        <input id="req-school" type="text" value={school}
          onChange={e => setSchool(e.target.value)} style={{ ...input, marginBottom: 0 }}
          placeholder="Ex : Pôle territorial de la Ville de Liège" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={mailtoHref()}
          style={{ ...btn, background: COLORS.teal, textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
          Envoyer la demande par email
        </a>
        <button type="button" onClick={onBack} style={btnGhost}>Retour</button>
      </div>
    </div>
  )
}

function SchoolRequestForm({ onBack }) {
  const [contactName, setContactName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [po, setPo] = useState('')

  const mailtoHref = () => {
    const subject = `Demande d'accès AccèsActif — école${schoolName ? ` — ${schoolName}` : ''}`
    const body = [
      `Nom du contact : ${contactName || '(à compléter)'}`,
      `École : ${schoolName || '(à compléter)'}`,
      `PO : ${po || '(à compléter)'}`,
      '',
      "Merci de créer mon compte sur AccèsActif pour cette école.",
    ].join('\n')
    return `mailto:${ACCESS_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 16 }}>
        Complétez ces informations puis envoyez le message : votre client mail s'ouvrira avec le
        message pré-rempli, envoyé depuis votre propre adresse. Le coordinateur du Pôle valide
        l'adresse et crée votre compte.
      </p>
      <div style={{ marginBottom: 14 }}>
        <label style={label} htmlFor="sreq-name">Votre nom</label>
        <input id="sreq-name" type="text" value={contactName}
          onChange={e => setContactName(e.target.value)} style={{ ...input, marginBottom: 0 }}
          placeholder="Ex : Marie Dupont" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={label} htmlFor="sreq-school">Nom de l'école</label>
        <input id="sreq-school" type="text" value={schoolName}
          onChange={e => setSchoolName(e.target.value)} style={{ ...input, marginBottom: 0 }}
          placeholder="Ex : École communale de..." />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={label} htmlFor="sreq-po">Pouvoir organisateur (PO)</label>
        <select id="sreq-po" value={po} onChange={e => setPo(e.target.value)}
          style={{ ...input, marginBottom: 0 }}>
          <option value="">— Choisir —</option>
          {PO_LIST.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={mailtoHref()}
          style={{ ...btn, background: COLORS.teal, textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
          Envoyer la demande par email
        </a>
        <button type="button" onClick={onBack} style={btnGhost}>Retour</button>
      </div>
    </div>
  )
}

function ForgotPasswordForm({ initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) return (
    <div>
      <p style={{ fontSize: BASE, color: COLORS.text, marginBottom: 4 }}>
        Un email a été envoyé à <strong>{email}</strong>.
      </p>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginBottom: 20 }}>
        Cliquez sur le lien qu'il contient pour choisir un nouveau mot de passe.
        Rien reçu d'ici quelques minutes ? Vérifiez vos courriers indésirables, ou
        contactez le coordinateur du Pôle.
      </p>
      <button type="button" onClick={onBack} style={btnGhost}>Retour à la connexion</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 16 }}>
        Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.
      </p>
      <div style={{ marginBottom: 18 }}>
        <label style={label} htmlFor="forgot-email">Email</label>
        <input id="forgot-email" type="email" autoComplete="username" value={email}
          onChange={e => setEmail(e.target.value)} required style={{ ...input, marginBottom: 0 }} />
      </div>
      {error && (
        <p role="alert" style={{ fontSize: BASE, color: COLORS.danger, marginBottom: 12 }}>{error}</p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading}
          style={{ ...btn, background: loading ? COLORS.muted : COLORS.teal }}>
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
        <button type="button" onClick={onBack} style={btnGhost}>Annuler</button>
      </div>
    </form>
  )
}

export default function LoginPage() {
  const [view, setView] = useState('login') // 'login' | 'forgot' | 'request-choice' | 'request-plai' | 'request-school'
  const [forgotEmail, setForgotEmail] = useState('')

  const titles = {
    login: 'Espace des membres du PLAI',
    forgot: 'Réinitialiser le mot de passe',
    'request-choice': 'Demander un accès',
    'request-plai': 'Demander un accès — membre du PLAI',
    'request-school': 'Demander un accès — école',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, padding: 20 }}>
      <div style={{ ...card, width: '100%', maxWidth: 400, padding: '32px 36px' }}>
        <img src="/plai-logo.jpg" alt="" style={{ height: 40, marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: COLORS.text }}>AccèsActif</h1>
        <p style={{ fontSize: BASE, color: COLORS.muted, marginBottom: 24 }}>
          {titles[view]}
        </p>
        {view === 'login' && (
          <LoginForm
            onForgot={email => { setForgotEmail(email); setView('forgot') }}
            onRequestAccess={() => setView('request-choice')}
          />
        )}
        {view === 'forgot' && (
          <ForgotPasswordForm initialEmail={forgotEmail} onBack={() => setView('login')} />
        )}
        {view === 'request-choice' && (
          <RequestChoice
            onChoose={kind => setView(kind === 'plai' ? 'request-plai' : 'request-school')}
            onBack={() => setView('login')}
          />
        )}
        {view === 'request-plai' && (
          <AccessRequestForm onBack={() => setView('request-choice')} />
        )}
        {view === 'request-school' && (
          <SchoolRequestForm onBack={() => setView('request-choice')} />
        )}
      </div>
    </div>
  )
}
