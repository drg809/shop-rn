import { useCallback, useRef, useState } from 'react';

export function useAccionUnica() {
  const [enCurso, setEnCurso] = useState(false);
  const refEnCurso = useRef(false);

  const ejecutar = useCallback(async (accion: () => Promise<void>) => {
    if (refEnCurso.current) return;
    refEnCurso.current = true;
    setEnCurso(true);
    try {
      await accion();
    } finally {
      refEnCurso.current = false;
      setEnCurso(false);
    }
  }, []);

  return { enCurso, ejecutar };
}