import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Input, InputGroup } from "@lawkit/ui";
import type { PasswordChangeValues } from "../passwordChangeSchema";
import * as css from "../settings.css";

interface PasswordFieldProps {
  control: Control<PasswordChangeValues>;
  name: keyof PasswordChangeValues;
  label: string;
  error: string | undefined;
}

// lawkit Input 은 ref 를 넘기지 않아 react-hook-form 과 Controller 로 연결한다.
export const PasswordField = ({ control, name, label, error }: PasswordFieldProps) => (
  <InputGroup label={label}>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Input type="password" value={field.value} onChange={field.onChange} aria-label={label} />
      )}
    />
    {error && <p role="alert" className={css.errorText}>{error}</p>}
  </InputGroup>
);
