---
title: 隐私政策
description: 单掌柜（OrderKeeper）如何在本机处理你的数据。
order: 1
---

**OrderKeeper（单掌柜）**
生效日期：2026-11-20

## 1. 我们收集哪些信息

单掌柜是一款纯本地记账与对账 App。我们不运营服务器，不收集、不上传、不共享你的业务数据。

- **你录入的数据**：客户名称、简称、电话、产品、订单、收款、对账记录、备注与图片附件。这些数据只保存在你的 iPhone 上。
- **订阅状态**：购买 Pro 订阅时，交易由 Apple 的 App Store 处理。App 通过 StoreKit 2 读取交易凭证判断会员状态，只在本机缓存会员标记与到期时间，用于离线时解锁 Pro 功能。
- **图片**：你通过相册或相机添加的图片会被压缩并保存在 App 沙盒内；App 不会读取相册中未选择的图片。

我们不使用统计 SDK、广告 SDK、推送 SDK，也不做跨 App 跟踪。

## 2. 权限用途

- **相机**：拍摄订单或收款凭证图片。仅在你主动点击拍照时调用。
- **相册（仅选择）**：通过系统照片选择器读取你主动选中的图片。

可在 iOS「设置 → 单掌柜」中随时关闭相机权限；关闭后仍可手动录入数据。

## 3. 备份与分享

- 备份文件由你在本机生成，经系统分享面板发送到你自己选择的位置（如文件 App、微信、AirDrop）。数据是否离开本机完全由你决定。
- 对账单和出库单通过系统分享面板发送，App 不会代为上传到任何服务器。

## 4. 订阅与付款

- 月付 ¥10、年付 ¥100 由 Apple 处理并管理自动续期；我们不接触你的支付方式。
- 可在 iOS「设置 → Apple 账户 → 订阅」中管理或取消订阅。
- 优惠码由 App Store 的 Offer Code / Promo Code 流程兑换。
- 退款按 Apple 的退款政策处理。

## 5. 数据保留与删除

- 数据保留在你的设备上，直到你在 App 内删除，或卸载 App。
- 「设置 → 数据 → 清空全部数据」会在创建一份本机快照后删除全部业务数据与图片。
- 卸载 App 会同时删除数据库、图片与快照。请先导出 `.okbackup` 备份。

## 6. 儿童

本 App 面向经营场景，不面向 13 岁以下儿童，也不会有意收集儿童信息。

## 7. 变更

若政策发生重大变更，会随 App 更新在本页公布。

## 8. 联系我们

隐私问题请联系：zhouyang.luo@gmail.com

---

*English summary: OrderKeeper stores all business data locally on your iPhone. We operate no server, do not collect analytics, and never upload your data. Subscriptions are processed by Apple via StoreKit. Backups and shared PDFs leave the device only when you choose to share them through the system share sheet.*
