export default function MessageSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {/* Received message */}
            <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mr-2" />
                <div className="bg-gray-200 rounded-2xl rounded-bl-md px-4 py-3 w-48 animate-pulse">
                    <div className="h-3 bg-gray-300 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-2/3" />
                </div>
            </div>

            {/* Sent message */}
            <div className="flex justify-end">
                <div className="bg-blue-100 rounded-2xl rounded-br-md px-4 py-3 w-56 animate-pulse">
                    <div className="h-3 bg-blue-200 rounded w-full mb-2" />
                    <div className="h-3 bg-blue-200 rounded w-3/4" />
                </div>
            </div>

            {/* Received message */}
            <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mr-2" />
                <div className="bg-gray-200 rounded-2xl rounded-bl-md px-4 py-3 w-40 animate-pulse">
                    <div className="h-3 bg-gray-300 rounded w-full" />
                </div>
            </div>

            {/* Sent message */}
            <div className="flex justify-end">
                <div className="bg-blue-100 rounded-2xl rounded-br-md px-4 py-3 w-44 animate-pulse">
                    <div className="h-3 bg-blue-200 rounded w-full mb-2" />
                    <div className="h-3 bg-blue-200 rounded w-1/2" />
                </div>
            </div>

            {/* Received message */}
            <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse mr-2" />
                <div className="bg-gray-200 rounded-2xl rounded-bl-md px-4 py-3 w-52 animate-pulse">
                    <div className="h-3 bg-gray-300 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-4/5 mb-2" />
                    <div className="h-3 bg-gray-300 rounded w-1/3" />
                </div>
            </div>
        </div>
    );
}
