import { ButtonGroup, Dropdown } from "@lawkit/ui";
import type { CycleTimeTargetTypes } from "@lawai/contracts";
import { formatRangeText, RANGE_PRESETS } from "../cycleTimeRange";
import type { RangePresetTypes } from "../cycleTimeRange";
import type { CycleTimeViewTypes } from "../hooks/useCycleTimeStats";
import * as css from "../stats.css";

interface StatsFiltersProps {
  view: CycleTimeViewTypes;
}

const TARGET_ITEMS = [
  { value: "contract", label: "계약" },
  { value: "advice", label: "법률자문" },
];

const RANGE_OPTIONS = RANGE_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }));

const getSingleValue = (value: string | string[]): string => (Array.isArray(value) ? value[0] ?? "" : value);

/** 대상·기간·담당자 필터와, 기간 기준과 현재 기준이 어떻게 다른지 밝히는 한 줄. */
export const StatsFilters = ({ view }: StatsFiltersProps) => (
  <>
    <div className={css.filters}>
      <ButtonGroup
        variant="segmented"
        items={TARGET_ITEMS}
        value={view.targetType}
        onChange={(value) => view.changeTargetType(String(value) as CycleTimeTargetTypes)}
      />
      <div className={css.filterSelect} role="group" aria-label="기간">
        <Dropdown
          options={RANGE_OPTIONS}
          value={view.preset}
          onChange={(value) => view.changePreset(getSingleValue(value) as RangePresetTypes)}
        />
      </div>
      <div className={css.filterSelect} role="group" aria-label="담당자">
        <Dropdown
          options={view.ownerOptions}
          value={view.ownerId}
          placeholder="담당자 전체"
          onChange={(value) => view.changeOwnerId(getSingleValue(value))}
        />
      </div>
      <div className={css.filterSpacer} />
      <span className={css.rangeText}>{formatRangeText(view.range)}</span>
    </div>

    <p className={css.countNote}>
      평균 소요일과 끝난 건수는 고른 기간에 그 단계를 끝낸 건만 셉니다. 멈춰 있는 건과 목표일 넘긴 건은 기간과 상관없이
      지금 기준입니다.
    </p>
  </>
);
