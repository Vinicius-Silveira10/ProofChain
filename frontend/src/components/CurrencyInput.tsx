import React, { useState, useEffect, forwardRef } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number; // em centavos
  onChange: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, className = '', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    const formatBRL = (centavos: number) => {
      const num = centavos / 100;
      return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    };

    useEffect(() => {
      if (value !== undefined && value !== null) {
        setDisplayValue(formatBRL(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value.replace(/\D/g, '');
      if (rawValue === '') rawValue = '0';
      
      const centavos = parseInt(rawValue, 10);
      
      setDisplayValue(formatBRL(centavos));
      onChange(centavos);
    };

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        value={displayValue === 'R$ 0,00' && value === 0 ? '' : displayValue}
        onChange={handleChange}
        placeholder={props.placeholder || 'R$ 0,00'}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white/50 backdrop-blur-sm ${className}`}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
