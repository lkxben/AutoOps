import TaskPlanClient from './TaskPlanClient'

export default async function Page({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = await params

  return <TaskPlanClient taskId={taskId} />
}