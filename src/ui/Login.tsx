import { useState } from 'react';
import { sendCode, verifyCode } from '../cloud';

/** Entrar con la cuenta de Excelsior RPG: email → código de 6 cifras. */
export function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = step === 'email' ? await sendCode(email) : await verifyCode(email, code);
    setBusy(false);
    if (err) setError(err);
    else if (step === 'email') setStep('code');
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Entrar</h2>
      <p className="muted">Usa el mismo email que en Excelsior RPG. Te llegará un código.</p>
      {step === 'email' ? (
        <input type="email" required autoFocus placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      ) : (
        <>
          <p className="muted">Código enviado a {email}.</p>
          <input inputMode="numeric" required autoFocus placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
        </>
      )}
      <button className="primary" disabled={busy}>{busy ? 'Un momento…' : step === 'email' ? 'Enviar código' : 'Entrar'}</button>
      {step === 'code' && (
        <button type="button" className="link" onClick={() => setStep('email')}>Cambiar email</button>
      )}
      {error && <p className="error">{error}</p>}
    </form>
  );
}
