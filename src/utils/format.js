export const formatCOP = (amount) => {
  if (isNaN(amount) || amount === null) return '$0';
  
  const currency = localStorage.getItem('balanza_currency') || 'COP';
  const locale = currency === 'COP' ? 'es-CO' : currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'es-ES' : 'es-CO';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'COP' ? 0 : 2
  }).format(amount);
};

// Alias export to easily update later if needed
export const formatCurrency = formatCOP;
