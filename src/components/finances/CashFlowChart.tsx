import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: { date: string; balance: number; revenue: number; expense: number }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2332] border border-white/[0.12] rounded-xl p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-2">
        {new Date(label).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name === 'balance' ? 'Saldo' : entry.name === 'revenue' ? 'Receita' : 'Despesa'}: R$ {entry.value.toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export function CashFlowChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-6 text-center">
        <p className="text-gray-500 text-sm">Nenhum dado financeiro registrado ainda.</p>
      </div>
    )
  }

  const minBalance = Math.min(...data.map(d => d.balance), 0)
  const maxBalance = Math.max(...data.map(d => d.balance), 1)
  const padding = (maxBalance - minBalance) * 0.2 || 100

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <h3 className="text-sm font-black text-gray-300 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Evolução do Caixa
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `R$${val.toFixed(0)}`}
              domain={[minBalance - padding, maxBalance + padding]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              name="balance"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#revenueGradient)"
              strokeDasharray="4 2"
              name="revenue"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#f97316"
              strokeWidth={1.5}
              fill="url(#expenseGradient)"
              strokeDasharray="4 2"
              name="expense"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 rounded bg-emerald-500" />
          <span className="text-[10px] text-gray-500">Saldo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 rounded bg-blue-500" style={{ borderTop: '2px dashed', borderColor: '#3b82f6', height: 0 }} />
          <span className="text-[10px] text-gray-500">Receita</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 rounded bg-orange-500" style={{ borderTop: '2px dashed', borderColor: '#f97316', height: 0 }} />
          <span className="text-[10px] text-gray-500">Despesa</span>
        </div>
      </div>
    </div>
  )
}
