import TaskForm from "@/app/components/TaskForm";

export default function Page() {
    return (
        <div className="w-full h-screen flex items-center justify-center">
            <div className="w-3/4 md:w-2/3 lg:w-1/2">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    Create a New Task
                </h1>
                <TaskForm />
            </div>
        </div>
    )
}