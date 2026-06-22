/** select/dropdown 옵션 중앙 관리 */
export interface SelectOption { value: string; label: string; }

export const toOptions = (items: string[]): SelectOption[] => items.map((o) => ({ value: o, label: o }));
