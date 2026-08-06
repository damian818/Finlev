import React, { useState, useMemo } from 'react';
import { Transaction, DisplayCurrency, AccountCustomBalance, TransactionFilter } from '../types';
import { computeAccountBalances, formatCurrency } from '../utils/financeUtils';
import { Wallet, DollarSign, Landmark, Edit3, Check, RotateCcw, HelpCircle, History, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface AccountsTabProps {
  transactions: Transaction[];
  displayCurrency: DisplayCurrency;
  usdArsRate: number;
  customBalances: Record<string, AccountCustomBalance>;
  onUpdateAccountBalance: (accountName: string, currentBalance: number, currency: string) => void;
  onNavigateToTransactionsWithFilter: (filter: TransactionFilter) => void;
}

const COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f43f5e', '#38bdf8', '#818cf8', '#fb7185'];

export function AccountsTab({
  transactions,
  displayCurrency,
  usdArsRate,
  customBalances,
  onUpdateAccountBalance,
  onNavigateToTransactionsWithFilter,
}: AccountsTabProps) {
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Calculate net transaction deltas per account
  const accountDeltas: Record<string, { netDelta: number; currency: string; txCount: number }> = {};
  transactions.forEach(tx => {
    const acc = tx.account || 'Unknown';
    const curr = tx.currency || 'ARS';
    if (!accountDeltas[acc]) {
      accountDeltas[acc] = { netDelta: 0, currency: curr, txCount: 0 };
    }
    accountDeltas[acc].txCount++;

    const amt = tx.amount || 0;
    if (tx.type === 'INCOME') {
      accountDeltas[acc].netDelta += amt;
    } else if (tx.type === 'EXPENSE') {
      accountDeltas[acc].netDelta -= amt;
    } else if (tx.type === 'TRANSFER') {
      const outflow = (tx.transferAmount && tx.transferAmount > 0) ? tx.transferAmount : amt;
      accountDeltas[acc].netDelta -= outflow;

      if (tx.toAccount) {
        const toAcc = tx.toAccount;
        const inflow = (tx.receiveAmount && tx.receiveAmount > 0)
          ? tx.receiveAmount
          : (tx.transferAmount && tx.transferAmount > 0 ? tx.transferAmount : outflow);
        if (!accountDeltas[toAcc]) {
          accountDeltas[toAcc] = { netDelta: 0, currency: tx.receiveCurrency || tx.transferCurrency || curr, txCount: 0 };
        }
        accountDeltas[toAcc].netDelta += inflow;
      }
    }
  });

  const accountNames = Array.from(new Set([...Object.keys(accountDeltas), ...Object.keys(customBalances)])).sort();

  // Reconstructed summary list
  const reconstructedAccounts = accountNames.map(name => {
    const deltaObj = accountDeltas[name] || { netDelta: 0, currency: 'ARS', txCount: 0 };
    const custom = customBalances[name];

    const currency = custom?.currency || deltaObj.currency || 'ARS';
    const isUsd = currency.toUpperCase().includes('USD');

    // Current live balance (user provided or calculated from sum)
    const currentBalance = custom !== undefined ? custom.currentBalance : deltaObj.netDelta;
    // Reconstructed initial balance backwards
    const reconstructedInitialBalance = custom !== undefined ? custom.currentBalance - deltaObj.netDelta : 0;

    const currentARS = isUsd ? currentBalance * usdArsRate : currentBalance;
    const currentUSD = isUsd ? currentBalance : (usdArsRate > 0 ? currentBalance / usdArsRate : 0);

    return {
      accountName: name,
      currency,
      originalCurrency: currency,
      isUsd,
      currentBalance,
      balanceOriginal: currentBalance,
      netDelta: deltaObj.netDelta,
      reconstructedInitialBalance,
      currentARS,
      currentUSD,
      txCount: deltaObj.txCount,
      hasCustom: custom !== undefined
    };
  }).filter(acc => acc.txCount > 0);

  const totalARS = reconstructedAccounts.reduce((acc, curr) => acc + (curr.currentARS > 0 ? curr.currentARS : 0), 0);
  const totalUSD = reconstructedAccounts.reduce((acc, curr) => acc + (curr.currentUSD > 0 ? curr.currentUSD : 0), 0);

  const pieData = useMemo(() => {
    return reconstructedAccounts
      .filter(acc => (displayCurrency === 'USD' ? acc.currentUSD : acc.currentARS) > 0)
      .map(acc => ({
        name: acc.accountName,
        value: displayCurrency === 'USD' ? acc.currentUSD : acc.currentARS
      }))
      .sort((a, b) => b.value - a.value);
  }, [reconstructedAccounts, displayCurrency]);

  const handleStartEdit = (accName: string, curVal: number) => {
    setEditingAccount(accName);
    setEditValue(curVal.toString());
  };

  const handleSaveEdit = (accName: string, currency: string) => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) {
      onUpdateAccountBalance(accName, num, currency);
    }
    setEditingAccount(null);
  };

  return (
    <div className="space-y-6">
      {/* Guidance Banner */}
      <div className="bg-[#121620] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Account Balance Reconstruction</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              CSV bank statements do not include initial account balances. Enter your <strong>actual current bank balance</strong> below and we will automatically reconstruct your historical account starting points backward.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#161b22] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Net Liquid (ARS)</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(totalARS, 'ARS')}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Converted at live market rates</span>
          </div>
          <div className="p-3 bg-slate-800 border border-slate-700 text-white rounded-xl shadow-inner">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161b22] p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Net Liquid (USD)</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(totalUSD, 'USD')}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Combined foreign & domestic balance</span>
          </div>
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 rounded-xl shadow-inner">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List & Balance Editor */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-slate-800 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Live & Reconstructed Account Balances</h3>
              <p className="text-xs text-slate-400">Click the edit pencil on any account to set its exact live bank balance.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reconstructedAccounts.map((acc) => {
              const isEditing = editingAccount === acc.accountName;

              return (
                <div 
                  key={acc.accountName} 
                  className="p-4 rounded-xl border border-slate-800 bg-[#121620] hover:border-emerald-500/50 hover:bg-[#1a212d] transition-all cursor-pointer space-y-3 group"
                  onClick={(e) => {
                    // Don't navigate if clicking the edit button or input
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                    onNavigateToTransactionsWithFilter({ account: acc.accountName });
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md">
                          {acc.currency}
                        </span>
                        {acc.hasCustom && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Live Calibrated
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1.5 flex items-center">
                        {acc.accountName}
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </h4>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {!isEditing ? (
                        <button
                          onClick={() => handleStartEdit(acc.accountName, acc.currentBalance)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 bg-[#161b22] hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors text-xs flex items-center"
                          title="Set current balance"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          <span className="text-[11px]">Set Balance</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveEdit(acc.accountName, acc.currency)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/80 border border-emerald-800 rounded-lg transition-colors text-xs flex items-center"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span className="text-[11px]">Save</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Balance Display or Input */}
                  <div className="bg-[#161b22] p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-[11px] text-slate-400 font-medium flex justify-between">
                      <span>Current Live Balance:</span>
                      <span className="text-slate-500">{acc.txCount} transactions</span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-400 font-bold">{acc.isUsd ? '$' : '$'}</span>
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 bg-[#0f131a] border border-slate-600 rounded text-sm font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-slate-50">
                          {formatCurrency(acc.balanceOriginal, acc.originalCurrency as DisplayCurrency)}
                        </div>
                        <div className="flex items-center space-x-3 text-[10px]">
                          <div className="flex items-center text-slate-400">
                            <span className="font-medium mr-1 uppercase opacity-60">ARS:</span>
                            <span className="font-mono text-slate-300">{formatCurrency(acc.currentARS, 'ARS')}</span>
                          </div>
                          <div className="flex items-center text-slate-400 border-l border-slate-800 pl-3">
                            <span className="font-medium mr-1 uppercase opacity-60">USD:</span>
                            <span className="font-mono text-slate-300">{formatCurrency(acc.currentUSD, 'USD')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backward Reconstruction Details */}
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1.5 text-slate-400">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <ArrowRightLeft className="w-3 h-3 mr-1 text-slate-500" />
                        Uploaded History Net Flow:
                      </span>
                      <span className={`font-semibold ${acc.netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {acc.netDelta >= 0 ? '+' : ''}{acc.isUsd ? `$${acc.netDelta.toLocaleString()}` : `$${acc.netDelta.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center text-slate-400">
                        <History className="w-3 h-3 mr-1 text-slate-500" />
                        Reconstructed Starting Balance:
                      </span>
                      <span className="font-semibold text-slate-300">
                        {acc.isUsd ? `$${acc.reconstructedInitialBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${acc.reconstructedInitialBalance.toLocaleString('es-AR')}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asset Distribution */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">Current Asset Distribution</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono uppercase">
              By {displayCurrency}
            </span>
          </div>
          
          <div className="h-64 w-full relative">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No positive balances found
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1200}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="#161b22" 
                          strokeWidth={3}
                          className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                          onClick={() => onNavigateToTransactionsWithFilter({ account: entry.name })}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const percent = ((Number(data.value) / (displayCurrency === 'USD' ? totalUSD : totalARS)) * 100).toFixed(1);
                          return (
                            <div className="bg-[#161b22] border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5">
                              <p className="font-bold text-slate-200">{data.name}</p>
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">Balance:</span>
                                <span className="font-bold text-emerald-400">{formatCurrency(Number(data.value), displayCurrency)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-slate-400">Share:</span>
                                <span className="font-bold text-slate-300">{percent}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Content for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Total</span>
                  <span className="text-sm font-bold text-slate-100">
                    {formatCurrency(displayCurrency === 'USD' ? totalUSD : totalARS, displayCurrency)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Legend / Breakdown List */}
          <div className="mt-4 space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
            {pieData.map((entry, index) => {
              const percent = ((entry.value / (displayCurrency === 'USD' ? totalUSD : totalARS)) * 100).toFixed(1);
              return (
                <div 
                  key={entry.name}
                  onClick={() => onNavigateToTransactionsWithFilter({ account: entry.name })}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs text-slate-300 truncate group-hover:text-white transition-colors">{entry.name}</span>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="text-[11px] font-mono font-bold text-slate-200">{formatCurrency(entry.value, displayCurrency)}</span>
                    <span className="text-[10px] text-slate-500 w-8 text-right">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
