/**
 * 平台手续费率
 *
 * 注意各平台扣费位置不一致：
 * - 悠悠有品：Spider 侧 youping/weapon_value.py 入库前已扣 1%，前端拿到的 yyyp_price 是净价
 * - BUFF：    Spider 侧存的是 sell_min_price 原始在售价，未扣费，需要前端折算
 * - Steam：   存原始价，未扣费
 *
 * BUFF 基础卖家费率为 2.5%，但账号可能享有低费率（见 APK 3.4.0 中 SellOrder 的
 * low_fee_rate / newest_low_fee_rate 字段），且可叠加手续费优惠券。
 * 因此本常量只适用于「库存估值」这类没有真实订单的估算场景；
 * 已成交订单一律以接口返回的 income 为准，不要用这里的固定费率反推。
 */
export const BUFF_FEE_RATE = 0.025

/** 按 BUFF 基础费率折算卖家实收；入参非数值时返回 0 */
export function buffNetPrice(price) {
  const n = Number(price)
  return Number.isFinite(n) ? n * (1 - BUFF_FEE_RATE) : 0
}
