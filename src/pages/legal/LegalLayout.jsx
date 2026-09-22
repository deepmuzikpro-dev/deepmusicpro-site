export default function LegalLayout({ title, children }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-6">{title}</h1>
      <div className="flex flex-col gap-4 text-dmp-white/75 leading-relaxed [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-lg [&_h2]:text-dmp-white [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </div>
  )
}
