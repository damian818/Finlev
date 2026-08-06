import React, { useState, useMemo } from 'react';
import { Transaction, DisplayCurrency, TransactionFilter } from '../types';
import { getCreditCardStatements, formatCurrency, getStatementCloseDateForTx } from '../utils/financeUtils';
import { X, CreditCard, Calendar, ArrowRightLeft, Plus, CheckCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';

interface CreditCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  transactions: Transaction[];
  displayCurrency: DisplayCurrency;
  usdArsRate: number;
  onAddTransaction: (tx: Transaction) => void;
  onNavigateToTransactionsWithFilter: (filter: TransactionFilter) => void;
}

export function CreditCardDetailModal({
  isOpen,
  onClose,
  accountName,
  transactions,
  displayCurrency,
  usdArsRate,
  onAddTransaction,
  onNavigateToTransactionsWithFilter,
}: CreditCardDetailModalProps) {
  const [selectedStatementIdx, setSelectedStatementIdx] = useState<number>(0);
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false);

  // Payment form state
  const [paidFromAccount, setPaidFromAccount] = useState('BBVA');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentNote, setPaymentNote] = useState('');

  const statements = useMemo(() => {
    return getCreditCardStatements(transactions, accountName, 25);
  }, [transactions, accountName]);

  const activeStatement = statements[selectedStatementIdx] || statements[0];

  if (!isOpen || !accountName) return null;

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    const paymentTx: Transaction = {
      id: `cc-pay-${Date.now()}`,
      date: new Date(paymentDate).toISOString(),
      title: paymentNote || `Pago Resumen ${accountName}`,
      category: 'Tarjetas de Crédito',
      account: paidFromAccount,
      toAccount: accountName,
      amount: amt,
      transferAmount: amt,
      receiveAmount: amt,
      currency: activeStatement?.currency || 'ARS',
      transferCurrency: activeStatement?.currency || 'ARS',
      receiveCurrency: activeStatement?.currency || 'ARS',
      type: 'CC_PAYMENT',
      statementCloseDate: activeStatement?.closeDate,
      description: `Payment for statement closing ${activeStatement?.closeDate || ''}`,
    };

    onAddTransaction(paymentTx);
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const handlePreFillPayment = () => {
    if (activeStatement) {
      const due = Math.max(0, activeStatement.netDue);
      setPaymentAmount(due > 0 ? due.toString() : '');
      setPaymentNote(`Pago Resumen ${activeStatement.closeDate}`);
      setShowPaymentForm(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#161b22] rounded-2xl max-w-3xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#121620] border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">{accountName}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  Credit Card Account
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Itemized expenses and statement payment details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-[#161b22] hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statement Selector Bar */}
        <div className="p-4 bg-[#0f131a] border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Statement Period:</span>
            <select
              value={selectedStatementIdx}
              onChange={(e) => setSelectedStatementIdx(Number(e.target.value))}
              className="px-3 py-1.5 bg-[#161b22] border border-slate-700 text-slate-100 font-semibold rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 flex-1 sm:flex-none"
            >
              {statements.map((stmt, idx) => (
                <option key={stmt.closeDate} value={idx}>
                  Closing {stmt.closeDate} ({formatCurrency(stmt.totalExpenses, stmt.currency as DisplayCurrency)})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePreFillPayment}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Record Statement Payment</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Cycle Metrics Header */}
          {activeStatement && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#121620] border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Statement Expenses</span>
                <div className="text-xl font-bold text-slate-100">
                  {formatCurrency(activeStatement.totalExpenses, activeStatement.currency as DisplayCurrency)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeStatement.expenses.length} itemized charges
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121620] border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Payments Applied</span>
                <div className="text-xl font-bold text-emerald-400">
                  {formatCurrency(activeStatement.totalPayments, activeStatement.currency as DisplayCurrency)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeStatement.payments.length} payment transfers
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-1 ${
                activeStatement.netDue <= 0 
                  ? 'bg-emerald-950/20 border-emerald-800/40' 
                  : 'bg-amber-950/20 border-amber-800/40'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Net Outstanding Due</span>
                  {activeStatement.netDue <= 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" /> Paid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <AlertCircle className="w-3 h-3" /> Outstanding
                    </span>
                  )}
                </div>
                <div className={`text-xl font-bold ${activeStatement.netDue <= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {formatCurrency(activeStatement.netDue, activeStatement.currency as DisplayCurrency)}
                </div>
                {activeStatement.dueDate && (
                  <div className="text-[10px] text-slate-400">
                    Est. Due Date: {activeStatement.dueDate}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Payment Drawer Form */}
          {showPaymentForm && activeStatement && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  Record Payment for Statement ({activeStatement.closeDate})
                </h4>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Paid From (Bank Account)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BBVA"
                    value={paidFromAccount}
                    onChange={(e) => setPaidFromAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Amount Paid ({activeStatement.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Itemized Statement Expenses */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                Itemized Credit Card Charges ({activeStatement?.expenses.length || 0})
              </h3>
              <button
                onClick={() => onNavigateToTransactionsWithFilter({ account: accountName })}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
              >
                <span>View in Transactions Tab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeStatement?.expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-[#121620] rounded-xl border border-slate-800 text-xs">
                No expense transactions recorded for this statement period.
              </div>
            ) : (
              <div className="bg-[#121620] rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0f131a] text-slate-400 border-b border-slate-800 font-medium text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Merchant / Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Cuota / Installments</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {activeStatement?.expenses.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                            {tx.date ? tx.date.substring(0, 10) : ''}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {tx.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {tx.installments ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                {tx.installments}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">1/1</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                            {formatCurrency(tx.amount, tx.currency as DisplayCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Statement Payments History */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              Recorded Payments & Credits ({activeStatement?.payments.length || 0})
            </h3>

            {activeStatement?.payments.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-[#121620] rounded-xl border border-slate-800 text-xs">
                No payments registered for this statement yet. Click "Record Statement Payment" above to record one.
              </div>
            ) : (
              <div className="bg-[#121620] rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0f131a] text-slate-400 border-b border-slate-800 font-medium text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Paid From</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {activeStatement?.payments.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                            {tx.date ? tx.date.substring(0, 10) : ''}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {tx.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                              {tx.account}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {formatCurrency(tx.receiveAmount || tx.transferAmount || tx.amount, tx.currency as DisplayCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121620] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
