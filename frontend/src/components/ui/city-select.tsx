import { useEffect, useId, useState } from "react"
import { regionApi, Region } from "@/services/api"
import { isCityAllowed, isProvinceAllowed } from "@/lib/allowed-regions"

interface CitySelectProps {
  initialCityCode?: string | null
  onChange: (city: Region | null) => void
  disabled?: boolean
  required?: boolean
}

export function CitySelect({
  initialCityCode,
  onChange,
  disabled = false,
  required = false,
}: CitySelectProps) {
  const baseId = useId()
  const provinceId = `${baseId}-province`
  const cityId = `${baseId}-city`

  const [provinces, setProvinces] = useState<Region[]>([])
  const [regencies, setRegencies] = useState<Region[]>([])
  const [provinceCode, setProvinceCode] = useState(initialCityCode?.slice(0, 2) ?? "")
  const [cityCode, setCityCode] = useState(initialCityCode ?? "")
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  const [provinceError, setProvinceError] = useState<string | null>(null)
  const [regencyError, setRegencyError] = useState<string | null>(null)
  const [provinceAttempt, setProvinceAttempt] = useState(0)
  const [regencyAttempt, setRegencyAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setLoadingProvinces(true)
      setProvinceError(null)

      regionApi
        .getProvinces()
        .then((data) => {
          if (!cancelled) {
            const filtered = data.filter((p) => isProvinceAllowed(p.code))
            setProvinces(filtered)
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setProvinceError(
              error instanceof Error ? error.message : "Gagal memuat provinsi."
            )
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingProvinces(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [provinceAttempt])

  useEffect(() => {
    let cancelled = false

    if (!provinceCode) {
      queueMicrotask(() => {
        if (cancelled) return
        setRegencies([])
        setLoadingRegencies(false)
        setRegencyError(null)
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setLoadingRegencies(true)
      setRegencyError(null)

      regionApi
        .getRegencies(provinceCode)
        .then((data) => {
          if (!cancelled) {
            const filtered = data.filter((c) => isCityAllowed(c.code))
            setRegencies(filtered)
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setRegencyError(
              error instanceof Error ? error.message : "Gagal memuat kota."
            )
            setRegencies([])
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingRegencies(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [provinceCode, regencyAttempt])

  const handleProvinceChange = (nextProvince: string) => {
    setProvinceCode(nextProvince)
    setCityCode("")
    setRegencies([])
    onChange(null)
  }

  const handleCityChange = (nextCity: string) => {
    setCityCode(nextCity)
    onChange(regencies.find((region) => region.code === nextCity) ?? null)
  }

  const retryProvinces = () => setProvinceAttempt((attempt) => attempt + 1)
  const retryRegencies = () => setRegencyAttempt((attempt) => attempt + 1)

  return (
    <div className="space-y-3" aria-busy={loadingProvinces || loadingRegencies || undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={provinceId} className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
            Provinsi
          </label>
          <select
            id={provinceId}
            value={provinceCode}
            onChange={(event) => handleProvinceChange(event.target.value)}
            required={required}
            disabled={disabled || loadingProvinces || !!provinceError}
            className="input"
          >
            <option value="">
              {loadingProvinces ? "Memuat provinsi..." : "Pilih provinsi"}
            </option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={cityId} className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
            Kota/Kabupaten
          </label>
          <select
            id={cityId}
            value={cityCode}
            onChange={(event) => handleCityChange(event.target.value)}
            required={required}
            disabled={disabled || !provinceCode || loadingRegencies || !!regencyError}
            className="input"
          >
            <option value="">
              {!provinceCode
                ? "Pilih provinsi dulu"
                : loadingRegencies
                  ? "Memuat kota..."
                  : "Pilih kota/kabupaten"}
            </option>
            {regencies.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="font-jakarta text-xs text-muted">
        📍 Layanan tersedia untuk area: Jawa Barat, DKI Jakarta, dan Banten (radius 150 km dari Bekasi)
      </p>

      {provinceError && (
        <div role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
          <p className="font-jakarta text-sm text-danger">{provinceError}</p>
          <button
            type="button"
            onClick={retryProvinces}
            className="inline-flex min-h-11 items-center px-1 font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
          >
            Coba lagi
          </button>
        </div>
      )}

      {regencyError && (
        <div role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
          <p className="font-jakarta text-sm text-danger">{regencyError}</p>
          <button
            type="button"
            onClick={retryRegencies}
            className="inline-flex min-h-11 items-center px-1 font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
          >
            Coba lagi
          </button>
        </div>
      )}
    </div>
  )
}
