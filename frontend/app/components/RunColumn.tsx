import RunCard from "@/app/components/RunCard"
import { RunModel } from "@/app/lib/types"

export default function RunColumn({
  title,
  runs,
  color = 'bg-gray-200',
}: {
  title: string
  runs: RunModel[]
  color?: string
}) {

  return (
    <section className="flex flex-col gap-4 flex-1 px-2 py-2">
      <div
        className={`flex items-center justify-between px-4 py-2 rounded-lg ${color} mx-auto`}
        style={{ width: '95%' }}
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </span>
        <span className="text-lg font-bold text-gray-900">
          {runs.length}
        </span>
      </div>

      <div
        className="flex flex-col gap-4 overflow-y-auto h-full"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {runs.length ? (
          runs.map(run => (
            <RunCard key={run.id} run={run} />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center h-full rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm">
            No runs {title.toLowerCase()}
          </div>
        )}

        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </section>
  )
}