import { onIdTokenChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, reload, getIdToken, signOut } from 'firebase/auth';
export function authError(error) {
  const messages = {
    'auth/invalid-credential': 'Revisa el correo o la contraseña.', 'auth/wrong-password': 'Revisa el correo o la contraseña.', 'auth/user-not-found': 'Revisa el correo o la contraseña.',
    'auth/invalid-email': 'Introduce un correo electrónico válido.', 'auth/email-already-in-use': 'No se puede crear esa cuenta. Prueba a entrar o recuperar la contraseña.',
    'auth/weak-password': 'Usa una contraseña de al menos 10 caracteres.', 'auth/too-many-requests': 'Demasiados intentos. Espera un momento antes de volver a probar.',
    'auth/network-request-failed': 'No se pudo conectar. Comprueba tu conexión.', 'auth/operation-not-allowed': 'El acceso por correo no está habilitado en Firebase.'
  };
  return new Error(messages[error.code] || 'No se pudo completar el acceso. Inténtalo de nuevo.');
}
export function createAuthController({ auth, onSession }) {
  const unsubscribe = onIdTokenChanged(auth, user => { Promise.resolve(onSession(user)).catch(() => {}); });
  return {
    destroy: unsubscribe,
    async dispatch(type, payload = {}) {
      try {
        switch (type) {
          case 'auth/login': await signInWithEmailAndPassword(auth, payload.email.trim(), payload.password); break;
          case 'auth/register': {
            if (payload.password.length < 10) throw Object.assign(new Error(), { code: 'auth/weak-password' });
            const result = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
            await sendEmailVerification(result.user); break;
          }
          case 'auth/reset-password': await sendPasswordResetEmail(auth, payload.email.trim()); break;
          case 'auth/resend-verification': if (!auth.currentUser) throw Error(); await sendEmailVerification(auth.currentUser); break;
          case 'auth/refresh': if (!auth.currentUser) throw Error(); await reload(auth.currentUser); await getIdToken(auth.currentUser, true); await onSession(auth.currentUser); break;
          case 'logout': await signOut(auth); break;
          default: throw Error();
        }
      } catch (error) { throw authError(error); }
    }
  };
}
