import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
  label: string;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  value?: string;
  visible: boolean;
  onChange: (value: string) => void;
  onVisibleChange: (visible: boolean) => void;
};

export default function PasswordField({
  label,
  placeholder,
  autoComplete,
  required,
  value,
  visible,
  onChange,
  onVisibleChange,
}: PasswordFieldProps) {
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <label className="field password-field">
      <span>{label}</span>
      <div className="password-control">
        <input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          onClick={() => onVisibleChange(!visible)}
        >
          <ToggleIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </label>
  );
}
