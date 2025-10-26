export default function Home() {
  return (
    <main className="card">
      <h2 className="mb-2 text-lg font-medium">Bienvenue</h2>
      <p className="text-sm opacity-80">
        Cette interface permet aux joueurs de rejoindre la partie et au Maître du Jeu d’orchestrer la soirée.
      </p>
      <div className="mt-4 flex gap-3">
        <a className="btn" href="/join">
          Rejoindre une partie
        </a>
        <a className="btn" href="/mj/dashboard">
          Accès MJ
        </a>
      </div>
    </main>
  );
}
