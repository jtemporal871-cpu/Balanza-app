export function calculateBalances(participants, expenses, expenseSplits, settlements) {
  const balances = {}
  
  participants.forEach(p => {
    balances[p.id] = { 
      id: p.id, 
      name: p.name, 
      paid_expenses: 0, 
      owed_expenses: 0, 
      paid_settlements: 0, 
      received_settlements: 0, 
      net_balance: 0 
    }
  })

  // 1. Sumamos lo que cada quien pagó de los gastos
  expenses.forEach(e => {
    if (balances[e.payer_id]) {
      balances[e.payer_id].paid_expenses += Number(e.amount)
    }
  })

  // 2. Sumamos lo que a cada quien le corresponde de los gastos (su consumo real)
  expenseSplits.forEach(s => {
    if (balances[s.participant_id]) {
      balances[s.participant_id].owed_expenses += Number(s.amount_owed)
    }
  })

  // 3. Contabilizamos las liquidaciones (pagos de deudas)
  settlements.forEach(s => {
    // payer_id es quien pagó su deuda (sale dinero)
    // payee_id es quien recibe el pago (entra dinero)
    if (balances[s.payer_id]) {
      balances[s.payer_id].paid_settlements += Number(s.amount)
    }
    if (balances[s.payee_id]) {
        balances[s.payee_id].received_settlements += Number(s.amount)
    }
  })

  // 4. Calculamos el Balance Neto Total
  // Balance Neto = (Lo que ha prestado al grupo) - (Lo que le debe al grupo)
  // Balance Positivo = La gente le debe
  // Balance Negativo = Le debe a la gente
  participants.forEach(p => {
     balances[p.id].net_balance = (balances[p.id].paid_expenses + balances[p.id].paid_settlements) - (balances[p.id].owed_expenses + balances[p.id].received_settlements)
  })

  // 5. Algoritmo de Simplificación de Deudas
  let debtors = []  // Los que están en negativo conforman los que deben
  let creditors = [] // Los que están en positivo conforman a quienes se les debe

  Object.values(balances).forEach(b => {
    // Se usa 0.01 para evitar problemas de precisión flotante en JS
    if (b.net_balance <= -0.01) debtors.push({ ...b, amount: Math.abs(b.net_balance) })
    if (b.net_balance >= 0.01) creditors.push({ ...b, amount: b.net_balance })
  })

  // Ordenamos de mayor a menor deuda para liquidar eficientemente
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const debts = []
  let d = 0, c = 0

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]
    const creditor = creditors[c]

    const amount = Math.min(debtor.amount, creditor.amount)
    const roundedAmount = Math.round(amount * 100) / 100

    if (roundedAmount > 0) {
      debts.push({
        id: `${debtor.id}-${creditor.id}-${Date.now()}-${Math.random()}`,
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: roundedAmount
      })
    }

    debtor.amount -= amount
    creditor.amount -= amount

    // Si la deuda restante es mínima procedemos al siguiente
    if (debtor.amount < 0.01) d++
    if (creditor.amount < 0.01) c++
  }

  return { balancesMap: balances, debts }
}
