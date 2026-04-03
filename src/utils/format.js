export const formatCOP = (amount) => {
  if (isNaN(amount) || amount === null) return '$0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Alias export to easily update later if needed
export const formatCurrency = formatCOP;
