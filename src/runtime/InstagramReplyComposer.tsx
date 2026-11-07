import { useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { SimulatedReplyKeys } from "./SimulatedReplyKeys";

export function InstagramReplyComposer({
  choices,
  context = "快拍",
  draft,
  onDraft,
  onSend,
  onClose,
}: {
  context?: string;
  choices: { label: string; target: string }[];
  draft: string;
  onDraft: (id: string) => void;
  onSend: (id: string) => void;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState(false);
  const choice = choices.find((choice) => choice.target === draft);
  const remove = () => {
    onDraft("");
    setSuggestions(false);
  };
  return (
    <section
      className="roommate-messages rig-reply-composer"
      data-keyboard="true"
      role="dialog"
      aria-label={context + "回复键盘"}
    >
      <header>
        <strong>{context === "评论" ? "回复评论" : context === "私信" ? "回复私信" : "回复快拍"}</strong>
        <button aria-label={"收起" + context + "回复"} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="rm-composer">
        <button
          className={"rm-compose-field" + (choice ? " has-draft" : "")}
          aria-label={context + "回复草稿"}
          onClick={() => setSuggestions(true)}
        >
          {choice?.label || "发消息…"}
        </button>
        {choice && (
          <button
            className="rm-send"
            aria-label={"发送" + context + "回复"}
            onClick={() => onSend(choice.target)}
          >
            <ArrowUp size={22} />
          </button>
        )}
      </div>
      {choice && (
        <div className="rm-draft-tools">
          <button onClick={() => setSuggestions(true)}>换个说法</button>
          <button onClick={remove}>删除草稿</button>
        </div>
      )}
      <div className="rm-keyboard" aria-label="模拟键盘">
        {suggestions ? (
          <div className="rm-suggestions" aria-label="回复选项">
            {choices.map((choice) => (
              <button
                key={choice.target}
                onClick={() => {
                  onDraft(choice.target);
                  setSuggestions(false);
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="rm-predictions">
            <span>我</span>
            <span>你</span>
            <span>好</span>
          </div>
        )}
        <SimulatedReplyKeys
          onPress={() => setSuggestions(true)}
          onDelete={remove}
        />
      </div>
    </section>
  );
}
