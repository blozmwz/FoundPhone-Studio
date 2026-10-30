import { useState } from "react";
import type { Item, Runtime, UiValue } from "../schema";
import { canOrderFood } from "./lifeInteractions";
import "./life-apps.css";

type Props = {
  items: Item[];
  state: Runtime;
  onEvent: (event: string, target: string) => void;
  onUi?: (key: string, value: UiValue) => void;
  onBack: () => void;
};
export function FilmList({ items, state, onEvent, onUi, onBack }: Props) {
  return (
    <section className="life-app">
      <header>
        <button onClick={onBack}>返回</button>
        <h1>电影片单</h1>
      </header>
      <p>有空慢慢看</p>
      {items.map((film) => {
        const id = film.meta.film;
        const saved = state.ui?.netflix?.["want-" + id] === true;
        const status = state.variables["filmStatus-" + id];
        return (
          <article key={id}>
            <h2>《{film.title}》</h2>
            <p>
              {status === "finished"
                ? "看完了"
                : status === "unfinished"
                  ? "没看完 · 下次接着看"
                  : "还没看"}
            </p>
            <div className="life-actions">
              <button
                aria-pressed={saved}
                onClick={() => onUi?.("want-" + id, !saved)}
              >
                {saved ? "已想看" : "想看／收藏"}
              </button>
              <button
                disabled={
                  !state.variables.lifeStage ||
                  Number(state.variables.lifeStage) >= 6
                }
                aria-pressed={state.variables.filmPlan === id}
                onClick={() => onEvent("planFilm", id)}
              >
                {state.variables.filmPlan === id
                  ? "今晚想看这部"
                  : "选作今晚电影"}
              </button>
            </div>
            {state.variables["filmReportReady-" + id] === true && (
              <div className="life-actions">
                <button onClick={() => onEvent("filmStatus", id + "-finished")}>
                  看完
                </button>
                <button
                  onClick={() => onEvent("filmStatus", id + "-unfinished")}
                >
                  没看完
                </button>
              </div>
            )}
          </article>
        );
      })}
      <small>选好后，可以在聊天里约他一起看。</small>
    </section>
  );
}
type Order = {
  food: string;
  title: string;
  flavor: string;
  date: string;
  time: string;
  price?: string;
  quantity?: number;
};
export function Delivery({ items, state, onEvent, onUi, onBack }: Props) {
  const [flavor, setFlavor] = useState(
    String(state.ui?.delivery?.flavor ?? "普通口味"),
  );
  let orders: Order[] = [];
  try {
    orders = JSON.parse(String(state.ui?.delivery?.orders ?? "[]"));
  } catch {
    /* a legacy invalid list starts empty */
  }
  const [notice, setNotice] = useState("");
  const stage = Number(state.variables.lifeStage || 0);
  const ready = canOrderFood(state);
  function order(item: Item) {
    if (!ready) return;
    const food = item.meta.food;
    onUi?.(
      "orders",
      JSON.stringify(
        [
          {
            food,
            price: item.meta.price,
            quantity: Number(item.meta.quantity || 1),
            title: item.title,
            flavor: food === "ramen" ? flavor : "",
            date: state.date ?? "",
            time: state.time,
          },
          ...orders,
        ].slice(0, 30),
      ),
    );
    onEvent("orderFood", food);
    setNotice(
      ["ramen", "pizza", "rice"].includes(food) && state.variables.henderyHome
        ? `${item.title}已下单 · 托他帮忙拿一下`
        : `${item.title}已下单 · 到了自己下楼拿`,
    );
  }
  return (
    <section className="life-app delivery-app">
      <header>
        <button onClick={onBack}>返回</button>
        <h1>Uber Eats</h1>
      </header>
      <p>今天吃点什么</p>
      <small>游戏内模拟点餐 · 无真实支付</small>
      {!ready && (
        <p role="status">
          {stage === 0
            ? "入住后，聊天告一段落时就可以点餐了。"
            : state.endings.length || stage >= 5
              ? "现在可以看看菜单和之前的订单。"
              : "先回完这轮消息，再来点餐吧。"}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {items
        .filter((item) => item.meta.authoredOrder !== "true")
        .map((item) => (
          <article key={item.id}>
            <h2>{item.title}</h2>
            <b className="delivery-price">
              {item.meta.currency || "$"}
              {item.meta.price}
            </b>
            <p>{item.body}</p>
            {item.meta.food === "ramen" && (
              <label>
                口味
                <select
                  aria-label="拉面口味"
                  value={flavor}
                  onChange={(e) => {
                    setFlavor(e.target.value);
                    onUi?.("flavor", e.target.value);
                  }}
                >
                  <option>普通口味</option>
                  <option>辣口味</option>
                </select>
              </label>
            )}
            <button disabled={!ready} onClick={() => order(item)}>
              下单 · {item.title}
              {Number(item.meta.quantity || 1) > 1
                ? " ×" + item.meta.quantity
                : ""}
            </button>
          </article>
        ))}
      <h2>最近订单</h2>
      {items
        .filter((item) => item.meta.authoredOrder === "true")
        .map((item) => (
          <p key={item.id}>
            {item.time} · {item.title} · {item.body}
          </p>
        ))}
      {orders.length ? (
        orders.map((o, i) => (
          <p key={i}>
            {o.date} {o.time} · {o.title} {o.flavor}{" "}
            {o.price ? "$" + o.price : ""}
          </p>
        ))
      ) : !items.some((item) => item.meta.authoredOrder === "true") ? (
        <p>还没有订单</p>
      ) : null}
    </section>
  );
}
