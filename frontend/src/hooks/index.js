import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Retrasa la actualización de un valor (útil para búsquedas)
 * @param {any} value
 * @param {number} delay ms
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Persiste estado en localStorage
 * @param {string} key
 * @param {any} initialValue
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.warn(`useLocalStorage error for key "${key}":`, err);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * Reloj en tiempo real actualizado cada segundo
 * @returns {Date}
 */
export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Controla visibilidad de un elemento (click fuera para cerrar)
 * @returns {{ ref, isOpen, toggle, close }}
 */
export function useDropdown() {
  const ref     = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close  = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return { ref, isOpen, toggle, close };
}

/**
 * Controla un formulario genérico con validación básica
 * @param {Object} initialValues
 * @param {Function} validate  — fn(values) => errors object
 */
export function useForm(initialValues, validate) {
  const [values, setValues]   = useState(initialValues);
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    if (validate) {
      const errs = validate(values);
      setErrors(errs);
    }
  }, [validate, values]);

  const handleSubmit = useCallback((onSubmit) => (e) => {
    e.preventDefault();
    if (validate) {
      const errs = validate(values);
      setErrors(errs);
      setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
      if (Object.keys(errs).length > 0) { return; }
    }
    onSubmit(values);
  }, [validate, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
  }, []);

  return { values, errors, touched, handleChange, handleBlur, handleSubmit, reset, setField };
}
