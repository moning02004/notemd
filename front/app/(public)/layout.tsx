export default function ({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-screen">
      {children}
    </div>
  );
}
