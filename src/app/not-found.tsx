export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <h1 className="text-6xl font-black mb-6">404</h1>
      <p className="text-2xl mb-8">Página no encontrada</p>
      <a href="/" className="bg-black text-white px-8 py-4 hover:bg-white hover:text-black hover:border-2 hover:border-black">
        VOLVER A LA TIENDA
      </a>
    </div>
  );
}