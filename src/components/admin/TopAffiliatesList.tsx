"use client";

interface TopAffiliate {
  id: string;
  code: string;
  name: string;
  totalEarnings: number;
  totalOrders: number;
  commissionRate: number;
}

interface TopAffiliatesListProps {
  affiliates: TopAffiliate[];
}

export function TopAffiliatesList({ affiliates }: TopAffiliatesListProps) {
  const maxEarnings = Math.max(...affiliates.map((a) => a.totalEarnings), 1);

  if (affiliates.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay afiliados registrados
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {affiliates.map((aff, index) => (
        <div key={aff.id} className="flex items-center gap-3 p-2 border border-gray-200">
          <div className="w-6 h-6 flex items-center justify-center bg-black text-white text-xs font-bold">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{aff.name}</p>
            <p className="text-xs text-gray-500">{aff.code} · {aff.totalOrders} pedidos</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">${aff.totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{(aff.commissionRate * 100).toFixed(0)}%</p>
          </div>
          <div className="w-16 h-2 bg-gray-200">
            <div
              className="h-full bg-black"
              style={{ width: `${(aff.totalEarnings / maxEarnings) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}