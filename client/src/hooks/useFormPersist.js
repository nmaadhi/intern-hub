import { useState, useEffect } from "react";

export function useFormPersist(key, initialValues) {
  const storageKey = "internhub_form_" + key;

  const [values, setValues] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialValues, ...parsed };
      }
    } catch {}
    return initialValues;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(values));
    } catch {}
  }, [storageKey, values]);

  const setValue = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setValues(initialValues);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  return { values, setValue, setValues, resetForm };
}
