export function AccessRestrictedNotice({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-base font-semibold text-slate-800 mb-1.5">Access Restricted</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        {message ?? "You don't have permission to access this page."}
      </p>
    </div>
  )
}
