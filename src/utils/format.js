export const formatCOP = (amount) => {
  if (isNaN(amount) || amount === null) return '$0';
  
  let currency = localStorage.getItem('balanza_currency');
  if (!['COP', 'USD', 'EUR', 'MXN'].includes(currency)) {
    currency = 'COP';
  }
  
  const locale = currency === 'COP' ? 'es-CO' : currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'es-ES' : currency === 'MXN' ? 'es-MX' : 'es-CO';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'COP' ? 0 : 2
    }).format(amount);
  } catch (e) {
    return `$ ${amount}`;
  }
};

// Alias export to easily update later if needed
export const formatCurrency = formatCOP;
