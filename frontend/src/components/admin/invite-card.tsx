"use client";

import { Check, Copy, Link2, RefreshCw, UserRound } from "lucide-react";
import type { Subgroup } from "@/lib/types";

export type Invitation = {
  subgroup: Subgroup;
  link: string | null;
  id?: string;
};

export function InviteCard({
  invitation,
  onCreate,
  onCopy,
  onRevoke,
}: {
  invitation: Invitation;
  onCreate: (subgroup: Subgroup) => void;
  onCopy: (subgroup: Subgroup, link: string) => void;
  onRevoke: (subgroup: Subgroup) => void;
}): React.JSX.Element {
  const { subgroup, link } = invitation;

  return (
    <article className="invite-card">
      <div className="invite-card-header">
        <span className="invite-card-icon" aria-hidden="true">
          <UserRound size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h2>Подгруппа {subgroup}</h2>
          <p>Многоразовая ссылка для студентов подгруппы</p>
        </div>
      </div>

      {link ? (
        <div style={{ marginTop: "16px" }}>
          <label className="sr-only" htmlFor={`invite-${subgroup}`}>
            Ссылка для подгруппы {subgroup}
          </label>
          <div className="invite-input-row">
            <input
              id={`invite-${subgroup}`}
              readOnly
              value={link}
            />
            <button
              className="invite-input-copy-btn"
              type="button"
              aria-label={`Копировать ссылку для подгруппы ${subgroup}`}
              title="Копировать ссылку"
              onClick={() => onCopy(subgroup, link)}
            >
              <Copy size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="invite-meta-row">
            <span className="invite-active-badge">
              <Check size={15} aria-hidden="true" />
              Ссылка активна
            </span>
            <button
              className="invite-revoke-btn"
              type="button"
              onClick={() => onRevoke(subgroup)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Отозвать ссылку для подгруппы {subgroup}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="button button-primary"
          style={{ width: "100%", marginTop: "20px" }}
          type="button"
          onClick={() => onCreate(subgroup)}
        >
          <Link2 size={16} aria-hidden="true" />
          Создать ссылку для подгруппы {subgroup}
        </button>
      )}
    </article>
  );
}
