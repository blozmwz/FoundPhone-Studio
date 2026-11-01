import { ArrowUp, Delete, Globe, Mic } from "lucide-react";

// Shared key rows from the existing Messages keyboard. Keys reveal authored
// replies; Enter never sends and Delete only removes the unsent draft.
export function SimulatedReplyKeys({
  onPress,
  onDelete,
}: {
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row, i) => (
        <div className={`rm-key-row rm-key-row-${i}`} key={row}>
          {i === 2 && (
            <button
              className="rm-key rm-mod"
              aria-label="大写"
              onClick={onPress}
            >
              <ArrowUp size={21} />
            </button>
          )}
          {[...row].map((k) => (
            <button className="rm-key" key={k} onClick={onPress}>
              {k}
            </button>
          ))}
          {i === 2 && (
            <button
              className="rm-key rm-mod"
              aria-label="删除"
              onClick={onDelete}
            >
              <Delete size={22} />
            </button>
          )}
        </div>
      ))}
      <div className="rm-key-row">
        <button className="rm-key rm-mod" onClick={onPress}>
          123
        </button>
        <button className="rm-key rm-mod" onClick={onPress}>
          ☺
        </button>
        <button className="rm-key rm-space" onClick={onPress}>
          空格
        </button>
        <button className="rm-key rm-mod" onClick={onPress}>
          换行
        </button>
      </div>
      <div className="rm-keyboard-foot">
        <button aria-label="切换语言" onClick={onPress}>
          <Globe size={27} />
        </button>
        <button aria-label="听写" onClick={onPress}>
          <Mic size={26} />
        </button>
      </div>
    </>
  );
}
