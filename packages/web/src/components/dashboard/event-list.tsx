import { User, Bot, Wrench } from "lucide-react";
import type { TimelineEvent } from "@/lib/timeline-events";

type EventListProps = {
  events: TimelineEvent[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  sessionStartedAt: string;
};

function formatElapsed(timestamp: string, sessionStartedAt: string): string {
  const t = new Date(timestamp).getTime();
  const start = new Date(sessionStartedAt).getTime();
  if (Number.isNaN(t) || Number.isNaN(start)) return "";
  const diffSec = Math.max(0, Math.floor((t - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTypeLabel(event: TimelineEvent): string {
  if (event.kind === "message") {
    return event.role === "HUMAN" ? "User" : "Agent";
  }
  if (event.isSkillCall && event.skillName) return event.skillName;
  if (event.isAgentCall && event.agentType) return `Agent:${event.agentType}`;
  return event.toolName;
}

function getPreview(event: TimelineEvent): string {
  if (event.kind === "message") {
    const stripped = event.content.replace(/\s+/g, " ").trim();
    return stripped.slice(0, 80);
  }
  if (event.skillName) return `Skill: ${event.skillName}`;
  if (event.agentType) return `Agent: ${event.agentType}`;
  const inputStr = event.toolInput ? JSON.stringify(event.toolInput) : "";
  if (inputStr) return inputStr.slice(0, 80);
  return `${event.toolName} call`;
}

function getIcon(event: TimelineEvent) {
  if (event.kind === "message") {
    if (event.role === "HUMAN") {
      return { Icon: User, bg: "bg-purple-500" };
    }
    return { Icon: Bot, bg: "bg-blue-500" };
  }
  const isSpecial = event.isSkillCall || event.isAgentCall;
  return { Icon: Wrench, bg: isSpecial ? "bg-amber-500" : "bg-gray-400" };
}

export function EventList({
  events,
  selectedIdx,
  onSelect,
  sessionStartedAt,
}: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        No events recorded
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {events.map((event, idx) => {
        const { Icon, bg } = getIcon(event);
        const isSelected = idx === selectedIdx;
        const label = getTypeLabel(event);
        const preview = getPreview(event);
        const time = formatElapsed(event.timestamp, sessionStartedAt);

        return (
          <li key={idx}>
            <button
              type="button"
              onClick={() => onSelect(idx)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 transition-colors ${
                isSelected
                  ? "border-l-4 border-purple-500 bg-purple-50"
                  : "border-l-4 border-transparent hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}
              >
                <Icon className="h-3 w-3 text-white" />
              </span>
              <span className="w-20 shrink-0 text-sm font-medium truncate">
                {label}
              </span>
              <span className="flex-1 truncate text-sm text-gray-600">
                {preview}
              </span>
              <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                {time}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
