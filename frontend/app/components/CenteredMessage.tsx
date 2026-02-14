export default function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <p className="text-center text-lg font-medium text-gray-700">
        {children}
      </p>
    </div>
  )
}