import { cn } from "@/lib/utils"

interface PhoneInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  autoComplete?: string
}

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  autoComplete = "tel-national",
}: PhoneInputProps) {
  const tooShort = value.length > 0 && value.length < 10
  const helpId = `${id}-help`
  const warningId = `${id}-warning`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
        {label}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 14))}
        required={required}
        disabled={disabled}
        maxLength={14}
        autoComplete={autoComplete}
        aria-invalid={tooShort || undefined}
        aria-describedby={tooShort ? `${helpId} ${warningId}` : helpId}
        className={cn("input", tooShort && "border-warning focus:border-warning")}
        placeholder="081234567890"
      />
      <p id={helpId} className="mt-1.5 font-jakarta text-xs text-muted">
        Hanya angka, 10-14 digit.
      </p>
      {tooShort && (
        <p id={warningId} role="status" className="mt-1 font-jakarta text-xs font-medium text-warning">
          Nomor telepon minimal 10 digit.
        </p>
      )}
    </div>
  )
}
