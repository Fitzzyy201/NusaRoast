import { cn } from "@/lib/utils"
import { ROAST_LEVELS, RoastLevel } from "@/lib/roast-levels"

const levelStyles: Record<
  RoastLevel,
  {
    surface: string
    muted: string
    rule: string
    dot: string
    empty: string
  }
> = {
  1: {
    surface: "bg-[#f3eadc] text-primary",
    muted: "text-primary/75",
    rule: "border-primary/15",
    dot: "bg-primary",
    empty: "border-primary/30",
  },
  2: {
    surface: "bg-[#e7d6c2] text-primary",
    muted: "text-primary/75",
    rule: "border-primary/15",
    dot: "bg-primary",
    empty: "border-primary/30",
  },
  3: {
    surface: "bg-[#cdb29a] text-primary",
    muted: "text-primary/75",
    rule: "border-primary/20",
    dot: "bg-primary",
    empty: "border-primary/30",
  },
  4: {
    surface: "bg-[#8a624b] text-background",
    muted: "text-background/90",
    rule: "border-background/20",
    dot: "bg-background",
    empty: "border-background/35",
  },
  5: {
    surface: "bg-[#3a2419] text-background",
    muted: "text-background/90",
    rule: "border-background/20",
    dot: "bg-background",
    empty: "border-background/35",
  },
}

export function RoastLevelGuide() {
  return (
    <section
      id="panduan-roast"
      aria-labelledby="panduan-roast-title"
      className="scroll-mt-24 border-b border-border bg-card py-10 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 grid gap-3 sm:mb-10 sm:gap-5 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">Panduan</p>
            <h2
              id="panduan-roast-title"
              className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-4xl"
            >
              Skala roast 1 sampai 5
            </h2>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-7">
              Tingkat roast menentukan karakter rasa kopi. Warna panel di bawah
              menunjukkan makin gelapnya tingkat pemanggangan.
            </p>
            <p className="mt-2 font-jakarta text-[11px] leading-5 text-muted sm:mt-3 sm:text-xs sm:leading-6">
              Skala 1 sampai 5 adalah skala internal NusaRoast, bukan standar
              industri. Tingkat roast juga bukan ukuran kekuatan seduhan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
          {ROAST_LEVELS.map((level) => {
            const style = levelStyles[level.level]
            return (
              <article
                key={level.level}
                className={cn(
                  "flex flex-col rounded-lg border border-black/5 p-3.5 sm:p-5 lg:min-h-[22rem]",
                  style.surface
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-display text-2xl font-semibold sm:text-3xl">{level.level}</span>
                    <h3 className="mt-0.5 font-jakarta text-[13px] font-semibold sm:mt-1 sm:text-sm">{level.name}</h3>
                  </div>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full border",
                          dot <= level.level ? style.dot : "bg-transparent",
                          dot > level.level ? style.empty : "border-transparent"
                        )}
                      />
                    ))}
                  </span>
                </div>

                <p className={cn("mt-3 font-jakarta text-xs leading-5", style.muted)}>
                  {level.description}
                </p>

                <dl
                  className={cn(
                    "mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 font-jakarta text-xs",
                    style.rule
                  )}
                >
                  <div>
                    <dt
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.08em]",
                        style.muted
                      )}
                    >
                      Profil
                    </dt>
                    <dd className="mt-1 leading-5">{level.profile}</dd>
                  </div>
                  <div>
                    <dt
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.08em]",
                        style.muted
                      )}
                    >
                      Keasaman
                    </dt>
                    <dd className="mt-1 leading-5">{level.acidity}</dd>
                  </div>
                  <div>
                    <dt
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.08em]",
                        style.muted
                      )}
                    >
                      Body
                    </dt>
                    <dd className="mt-1 leading-5">{level.body}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.08em]",
                        style.muted
                      )}
                    >
                      Cocok untuk
                    </dt>
                    <dd className="mt-1 leading-5">{level.brew}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
