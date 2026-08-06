import React, { useState } from 'react';
import { Transaction } from '../types';
import { X, PlusCircle } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Transaction) => void;
}

export function AddTransactionModal({ isOpen, onClose, onAddTransaction }: AddTransactionModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Alimentos y Bebidas');
  const [account, setAccount] = useState('BBVA');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title || isNaN(parsedAmount)) return;

    const newTx: Transaction = {
      id: `manual-${Date.now()}`,
      date: new Date(date).toISOString(),
      title,
      category,
      account,
      amount: parsedAmount,
      currency,
      type,
      description: description || undefined,
    };

    onAddTransaction(newTx);
    onClose();
    setTitle('');
    setAmount('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100">Add New Transaction</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Title / Merchant</label>
            <input
              type="text"
              required
              placeholder="e.g. Supermarket Coto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Alimentos y Bebidas"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Account</label>
              <input
                type="text"
                placeholder="e.g. Visa BBVA"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="Notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f131a] border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder-slate-500"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-lg font-medium text-slate-300 bg-[#121620] hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg font-medium hover:bg-slate-700"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
