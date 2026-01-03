import TaskCard from "@/app/components/TaskCard"
import { TaskModel } from "@/app/lib/types"

export default function TaskSection({
  title,
  tasks,
}: {
  title: string
  tasks: TaskModel[]
}) {
  return (
    <section className="flex flex-col gap-2 h-[calc((100vh-4rem)/3)]">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 px-2">
        {title}
      </h2>

      <div
        className="flex gap-4 overflow-x-auto px-2 h-full
                   scrollbar-thin scrollbar-thumb-gray-300"
      >
        {tasks.length ? (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center h-full rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm">
            No tasks {title.toLowerCase()}
          </div>
        )}
      </div>
    </section>
  )
}