const Loader = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-orange-50 rounded-lg border border-orange-200">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600"></div>
      <p className="text-orange-700 font-semibold">{message}</p>
    </div>
  )
}

export default Loader
