import { useCallback, useEffect, useState } from 'react';

const CLAVE_TEMA = 'dlacasa_tema';
const OPCIONES = ['sistema', 'claro', 'oscuro'];

const leerPreferencia = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    return OPCIONES.includes(guardado) ? guardado : 'sistema';
  } catch {
    return 'sistema';
  }
};

/** Decide si corresponde tema oscuro (función pura, fácil de probar). */
export const esTemaOscuro = (preferencia, sistemaOscuro) =>
  preferencia === 'oscuro' || (preferencia === 'sistema' && sistemaOscuro);

const aplicarTema = (preferencia) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', esTemaOscuro(preferencia, sistemaOscuro));
};

export function useTema() {
  const [preferencia, setPreferencia] = useState(leerPreferencia);

  useEffect(() => {
    aplicarTema(preferencia);
    if (preferencia !== 'sistema') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => aplicarTema('sistema');
    media.addEventListener('change', alCambiar);
    return () => media.removeEventListener('change', alCambiar);
  }, [preferencia]);

  const elegirTema = useCallback((nueva) => {
    setPreferencia(nueva);
    try {
      localStorage.setItem(CLAVE_TEMA, nueva);
    } catch {
      // Sin almacenamiento disponible: el tema solo dura la sesión.
    }
  }, []);

  return { preferencia, elegirTema };
}
