export default function Hero({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="mt-5 rounded-2xl bg-gradient-to-b from-primary-soft to-white px-5 py-7 sm:mt-6 sm:px-8 sm:py-10">
      <h1 className="max-w-2xl text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted mt-3 max-w-xl text-sm leading-relaxed sm:mt-4 sm:text-base">
          {description}
        </p>
      )}
    </section>
  )
}
