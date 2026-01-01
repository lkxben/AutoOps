import TaskForm from "@/app/components/TaskForm";

export default function Page() {
    return (
        <div className="w-full h-screen flex flex-col">
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                <h2 className="text-xl font-semibold">Enter your task</h2>
                <TaskForm />
            </div>
        </div>
    )
}