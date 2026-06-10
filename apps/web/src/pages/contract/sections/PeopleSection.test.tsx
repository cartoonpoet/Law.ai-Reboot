import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { PeopleSection } from "./PeopleSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><PeopleSection /></FormProvider>;
}

describe("PeopleSection", () => {
  it("참조수신자/업무담당자 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("참조수신자")).toBeInTheDocument();
    expect(screen.getByText("업무담당자")).toBeInTheDocument();
  });
});
