import { useState } from "react";
import { Modal, Input, Button, Icon, Avatar } from "@lawkit/ui";
import type { DirectoryEntry } from "../../../api/directory";
import { useUserSearch } from "../hooks/useUserSearch";
import * as css from "./assignModal.css";

interface AssignModalProps {
  onClose: () => void;
  onAssign: (ownerId: string) => void;
  isAssigning?: boolean;
}

/** 배정 모달 — 디렉터리에서 담당자를 검색·선택해 배정(status="assigning"). */
export function AssignModal({ onClose, onAssign, isAssigning }: AssignModalProps) {
  const { users, search } = useUserSearch();
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);

  const handleAssign = () => {
    if (!selected) return;
    onAssign(selected.id);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="검토 담당자 배정"
      footer={
        <div className={css.footRow}>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={handleAssign} disabled={!selected || isAssigning}>
            배정
          </Button>
        </div>
      }
    >
      <div className={css.body}>
        <div className={css.searchRow}>
          <Input
            placeholder="이름·부서로 담당자 검색"
            rightIcon={<Icon name="search" size="sm" />}
            onChange={(e) => search(e.target.value)}
          />
        </div>

        {selected && (
          <div className={css.selectedRow}>
            <Avatar size="sm" color="primary" initials={selected.name[0]} />
            <span className={css.selectedLabel}>선택됨</span>
            <span className={css.selectedName}>{selected.name}</span>
          </div>
        )}

        <div className={css.peopleScroll}>
          {users.length === 0 ? (
            <div className={css.empty}>검색 결과가 없습니다.</div>
          ) : (
            users.map((u) => {
              const isSelected = selected?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={isSelected ? `${css.personRow} ${css.personRowOn}` : css.personRow}
                  onClick={() => setSelected(u)}
                >
                  <Avatar size="sm" color="secondary" initials={u.name[0]} />
                  <div className={css.personMain}>
                    <div className={css.personName}>{u.name}</div>
                  </div>
                  {isSelected && (
                    <span className={css.personCheck}>
                      <Icon name="check" size="sm" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
