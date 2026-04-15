# Task 16-b: Customer CSV Export + Dashboard KPI Mini-Cards + Print Styles

## Task Summary
Added customer CSV export column alignment, dashboard KPI mini-cards, enhanced print styles, and verified sales receipt print feature.

## Work Done

### 1. Customer CSV Export (customers-tab.tsx)
- Updated CSV columns to match spec: 客户名称, 电话, 微信, VIP等级, 累计消费, 订单数, 最近购买日期, 备注
- Styled export button with emerald theme matching sales/inventory tabs
- Kept BOM, quote/comma escaping, and download filename format

### 2. Dashboard KPI Mini-Cards
- Created `/api/dashboard/kpi-details` API endpoint
- Added 6 compact KPI cards after overview cards in dashboard-tab.tsx
- Cards: 总库存金额, 平均单品成本, 最贵货品, 本月新增, 待处理退货, 毛利率
- Responsive: 2/3/6 column grid
- card-glow hover effect

### 3. Print Styles (globals.css)
- Enhanced @media print rules
- Hide nav, footer, floating buttons, toasts, loading bars
- Table page-break controls
- Print-friendly fonts
- Hide decorative elements

### 4. Sales Print Receipt
- Verified existing implementation is complete (dialog + print CSS + button in desktop/mobile)

## Files Changed
- `src/app/api/dashboard/kpi-details/route.ts` (NEW)
- `src/components/inventory/dashboard-tab.tsx`
- `src/components/inventory/customers-tab.tsx`
- `src/app/globals.css`

## Lint Result
- 0 errors, 0 warnings
