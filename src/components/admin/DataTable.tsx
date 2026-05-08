"use client";

import type { ReactNode } from "react";

interface Column {
  key: string;
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: Record<string, any>) => ReactNode;
}

interface DataTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Column[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: Record<string, any>) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function DataTable({
  data,
  columns,
  onRowClick,
  loading,
  emptyMessage = "No hay datos",
}: DataTableProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-1" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:overflow-x-auto border border-black">
        <table className="w-full">
          <thead>
            <tr className="bg-black text-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="text-left py-3 px-4 font-bold"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-black hover:bg-gray-50 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="py-3 px-4">
                    {column.render
                      ? column.render(getNestedValue(row, column.key), row)
                      : getNestedValue(row, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

<div className="md:hidden space-y-4">
        {data.map((row) => (
          <div
            key={row.id}
            className="border-2 border-black p-4"
          >
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                <span className="text-sm text-gray-500">{column.header}</span>
                <span className="font-medium text-right">
                  {column.render
                    ? column.render(getNestedValue(row, column.key), row)
                    : getNestedValue(row, column.key)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}