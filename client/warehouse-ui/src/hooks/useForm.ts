import { useState, ChangeEvent } from 'react';

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const setFieldValue = <K extends keyof T>(name: K, value: T[K]) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const reset = (newValues?: Partial<T>) => {
    setValues({
      ...initialValues,
      ...(newValues || {})
    });
  };

  return {
    values,
    setValues,
    handleChange,
    setFieldValue,
    reset
  };
}
