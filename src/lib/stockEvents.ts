type StockListener = (productId: string, availableStock: number) => void;

class StockEventBus {
  private listeners = new Set<StockListener>();

  subscribe(listener: StockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  broadcast(productId: string, availableStock: number): void {
    this.listeners.forEach((listener) => {
      try {
        listener(productId, availableStock);
      } catch {}
    });
  }
}

export const stockEventBus = new StockEventBus();
