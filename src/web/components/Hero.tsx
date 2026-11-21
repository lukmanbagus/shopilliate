export default function Hero({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="mt-4 rounded-2xl bg-gradient-to-b from-[#FDE9DF] to-white px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted mt-2 max-w-xl text-sm sm:text-base">
          {description}
        </p>
      )}
    </section>
  )
}
