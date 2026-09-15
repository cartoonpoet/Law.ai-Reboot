import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ContractCategoryDto } from "@lawai/contracts";
import { OverviewSection } from "./OverviewSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

// 시드 트리(대>중>소): cascade·역산 검증용 최소 구조.
const CATEGORY_TREE: ContractCategoryDto[] = [
  { id: "dev", name: "개발/공급", slug: "dev-supply", parentId: null, sortOrder: 0 },
  { id: "advisory", name: "자문", slug: "advisory", parentId: null, sortOrder: 1 },
  { id: "software", name: "소프트웨어", slug: "dev-supply.software", parentId: "dev", sortOrder: 0 },
  { id: "saas", name: "SaaS 이용", slug: "dev-supply.software.saas", parentId: "software", sortOrder: 0 },
  { id: "license", name: "라이선스", slug: "dev-supply.software.license", parentId: "software", sortOrder: 1 },
  // advisory 도 자식을 둬 잎이 아니게 함(루트 변경 시 categoryId 가 비워지는지 검증용).
  { id: "legal", name: "법률", slug: "advisory.legal", parentId: "advisory", sortOrder: 0 },
];

// 폼 categoryId 값을 화면에 노출해 단언에 사용.
function CategoryIdProbe() {
  const categoryId = useWatch<ContractRequestForm, "categoryId">({ name: "categoryId" });
  return <output data-testid="categoryId">{categoryId}</output>;
}

function renderSection(initialCategoryId = "") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // useContractCategories 가 읽는 캐시 키에 트리를 미리 주입(네트워크 없이 데이터 제공).
  queryClient.setQueryData(["contractCategories"], CATEGORY_TREE);

  function Wrap() {
    const methods = useForm<ContractRequestForm>({
      defaultValues: { ...contractRequestDefaults, categoryId: initialCategoryId },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <FormProvider {...methods}>
          <OverviewSection />
          <CategoryIdProbe />
        </FormProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrap />);
}

// placeholder 텍스트로 Dropdown 트리거를 찾아 클릭한 뒤, 펼쳐진 listbox 에서 옵션을 선택.
async function selectOption(triggerText: string, optionLabel: string) {
  const user = userEvent.setup();
  await user.click(screen.getByText(triggerText));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByText(optionLabel));
}

describe("OverviewSection", () => {
  it("핵심 필드 라벨을 렌더한다", () => {
    renderSection();
    expect(screen.getByText("계약명")).toBeInTheDocument();
    expect(screen.getByText("계약 분류")).toBeInTheDocument();
    expect(screen.getByText("상대 계약자 정보")).toBeInTheDocument();
  });

  it("대분류는 API 트리의 루트 노드를 옵션으로 렌더한다", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByText("계약 대분류"));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("개발/공급")).toBeInTheDocument();
    expect(within(listbox).getByText("자문")).toBeInTheDocument();
    // 중분류 노드는 루트 옵션에 없다.
    expect(within(listbox).queryByText("소프트웨어")).not.toBeInTheDocument();
  });

  it("대분류 선택 후 중분류만 선택하면(잎 아님) categoryId 는 아직 비어 있다", async () => {
    renderSection();
    await selectOption("계약 대분류", "개발/공급");
    await selectOption("계약 중분류", "소프트웨어");
    expect(screen.getByTestId("categoryId")).toHaveTextContent("");
  });

  it("소분류(잎) 선택 시 categoryId 가 해당 노드 id 로 설정된다", async () => {
    renderSection();
    await selectOption("계약 대분류", "개발/공급");
    await selectOption("계약 중분류", "소프트웨어");
    await selectOption("계약 소분류", "SaaS 이용");
    expect(screen.getByTestId("categoryId")).toHaveTextContent("saas");
  });

  it("상위(대분류) 변경 시 categoryId 가 리셋된다(하위 리셋)", async () => {
    renderSection();
    await selectOption("계약 대분류", "개발/공급");
    await selectOption("계약 중분류", "소프트웨어");
    await selectOption("계약 소분류", "SaaS 이용");
    expect(screen.getByTestId("categoryId")).toHaveTextContent("saas");

    // 대분류를 다른 루트로 바꾸면 하위 선택과 categoryId 가 비워진다.
    await selectOption("개발/공급", "자문");
    expect(screen.getByTestId("categoryId")).toHaveTextContent("");
  });

  it("저장된 categoryId 로 대/중 선택을 역산 복원한다(수정 화면)", () => {
    renderSection("saas");
    expect(screen.getByTestId("categoryId")).toHaveTextContent("saas");
    // 초기 path 역산: 대=개발/공급, 중=소프트웨어 가 선택 라벨로 트리거에 표시된다.
    expect(screen.getByText("개발/공급")).toBeInTheDocument();
    expect(screen.getByText("소프트웨어")).toBeInTheDocument();
  });

  it("체결 완료 등록을 고르면 체결일이 뜨고 검토 요청자가 사라진다", async () => {
    renderSection();
    await userEvent.click(screen.getByRole("button", { name: /체결 완료 등록/ }));
    expect(screen.getByText("체결일")).toBeInTheDocument();
    expect(screen.queryByText("검토 요청자")).not.toBeInTheDocument();
  });

  it("신규계약이면 원 계약을 묻지 않고, 갱신·변경·해지를 고르면 체결 계약을 찾는 원 계약 필드가 나타난다", async () => {
    renderSection();
    expect(screen.queryByText("원 계약")).not.toBeInTheDocument();

    for (const label of ["갱신", "변경", "해지"]) {
      await userEvent.click(screen.getByLabelText(label));
      expect(screen.getByText("원 계약")).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "원 계약 검색" })).toBeInTheDocument();
    }
  });
});
