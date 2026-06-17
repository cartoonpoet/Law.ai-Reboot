import { Controller, useFormContext } from "react-hook-form";
import { FileUploadArea, FileItem } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { formatFileMeta } from "../fileMeta";
import * as css from "../contractRequest.css";

type FileFieldName = "contractFiles" | "attachFiles" | "refFiles";

interface FileUploadFieldProps {
  name: FileFieldName;
  description?: string;
  accept?: string;
}

export function FileUploadField({ name, description, accept }: FileUploadFieldProps) {
  const { control } = useFormContext<ContractRequestForm>();
  return (
    <Controller name={name} control={control} render={({ field }) => {
      const files = field.value;
      const handleFilesAdded = (added: File[]) =>
        field.onChange([...files, ...added.map((f) => ({ name: f.name, meta: formatFileMeta(f) }))]);
      const handleDelete = (target: number) =>
        field.onChange(files.filter((_, index) => index !== target));
      return (
        <FileUploadArea accept={accept} description={description} onFilesAdded={handleFilesAdded}>
          {files.length > 0 && (
            <div className={css.fileList}>
              {files.map((file, index) => (
                <FileItem key={`${file.name}-${index}`} filename={file.name} fileMeta={file.meta} onDelete={() => handleDelete(index)} />
              ))}
            </div>
          )}
        </FileUploadArea>
      );
    }} />
  );
}
