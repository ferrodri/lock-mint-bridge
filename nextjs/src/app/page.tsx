export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Lock-Mint Bridge</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Lock a token on OP Sepolia and mint the equivalent on Base Sepolia.
        </p>
      </div>
    </main>
  );
}
