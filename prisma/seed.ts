import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据...');

  // 1. 系统配置
  const configs = [
    { key: 'operating_cost_rate', value: '0.05', description: '经营成本率' },
    { key: 'markup_rate', value: '0.30', description: '零售价上浮比例' },
    { key: 'aging_threshold_days', value: '90', description: '压货预警天数' },
    { key: 'default_alloc_method', value: 'equal', description: '默认分摊算法' },
  ];
  for (const c of configs) {
    await prisma.sysConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log('✅ 系统配置已插入 (4条)');

  // 2. 材质 (36种)
  const materials = [
    { name: '黄金', subType: 'k999', sortOrder: 1 },
    { name: '银', subType: '990', costPerGram: 25, sortOrder: 2 },
    { name: 'k铂金', sortOrder: 3 },
    { name: '铂金', sortOrder: 4 },
    { name: '18K金', costPerGram: 780, sortOrder: 5 },
    { name: '翡翠', origin: '缅甸', sortOrder: 6 },
    { name: '和田玉', sortOrder: 7 },
    { name: '珍珠', subType: '淡水珠', origin: '浙江', sortOrder: 8 },
    { name: '朱砂', sortOrder: 9 },
    { name: '蜜蜡', sortOrder: 10 },
    { name: '碧玺', sortOrder: 11 },
    { name: '青金石', sortOrder: 12 },
    { name: '黑曜石', sortOrder: 13 },
    { name: '金曜石', sortOrder: 14 },
    { name: '玛瑙', sortOrder: 15 },
    { name: '琥珀', sortOrder: 16 },
    { name: '锆石', origin: '梧州', sortOrder: 17 },
    { name: '斑彩螺', origin: '意大利', sortOrder: 18 },
    { name: '金虎眼', sortOrder: 19 },
    { name: '虎眼', sortOrder: 20 },
    { name: '粉晶', sortOrder: 21 },
    { name: '紫水晶', sortOrder: 22 },
    { name: '莹石', sortOrder: 23 },
    { name: '绿幽灵', sortOrder: 24 },
    { name: '白幽灵', sortOrder: 25 },
    { name: '彩幽灵', sortOrder: 26 },
    { name: '金发晶', sortOrder: 27 },
    { name: '钛晶', sortOrder: 28 },
    { name: '巴西黄水晶', sortOrder: 29 },
    { name: '人工黄水晶', sortOrder: 30 },
    { name: '红幽灵', sortOrder: 31 },
    { name: '蓝晶石', sortOrder: 32 },
    { name: '海蓝宝', sortOrder: 33 },
    { name: '天河石', sortOrder: 34 },
    { name: '红绿宝石共生', sortOrder: 35 },
    { name: '车花透辉石', sortOrder: 36 },
  ];
  for (const m of materials) {
    await prisma.dictMaterial.upsert({
      where: { name: m.name },
      update: {},
      create: m,
    });
  }
  console.log('✅ 材质已插入 (36种)');

  // 3. 器型 (9种)
  const types = [
    { name: '手镯', specFields: JSON.stringify(['weight', 'bracelet_size']), sortOrder: 1 },
    { name: '挂件', specFields: JSON.stringify(['weight', 'size']), sortOrder: 2 },
    { name: '吊坠', specFields: JSON.stringify(['weight', 'size']), sortOrder: 3 },
    { name: '手串/手链', specFields: JSON.stringify(['weight', 'bead_count', 'bead_diameter']), sortOrder: 4 },
    { name: '项链', specFields: JSON.stringify(['weight', 'bead_count', 'bead_diameter']), sortOrder: 5 },
    { name: '脚链', specFields: JSON.stringify(['weight', 'bead_count', 'bead_diameter']), sortOrder: 6 },
    { name: '戒指', specFields: JSON.stringify(['weight', 'ring_size']), sortOrder: 7 },
    { name: '耳饰', specFields: JSON.stringify(['weight']), sortOrder: 8 },
    { name: '摆件', specFields: JSON.stringify(['weight', 'size']), sortOrder: 9 },
  ];
  for (const t of types) {
    await prisma.dictType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log('✅ 器型已插入 (9种)');

  // 4. 标签 (22个, 4组)
  const tags = [
    // 种水
    { name: '玻璃种', groupName: '种水' },
    { name: '冰种', groupName: '种水' },
    { name: '糯冰种', groupName: '种水' },
    { name: '糯种', groupName: '种水' },
    { name: '豆种', groupName: '种水' },
    // 颜色
    { name: '满绿', groupName: '颜色' },
    { name: '飘花', groupName: '颜色' },
    { name: '紫罗兰', groupName: '颜色' },
    { name: '黄翡', groupName: '颜色' },
    { name: '墨翠', groupName: '颜色' },
    { name: '无色', groupName: '颜色' },
    // 工艺
    { name: '手工雕', groupName: '工艺' },
    { name: '机雕', groupName: '工艺' },
    { name: '素面', groupName: '工艺' },
    // 题材
    { name: '观音', groupName: '题材' },
    { name: '佛公', groupName: '题材' },
    { name: '平安扣', groupName: '题材' },
    { name: '如意', groupName: '题材' },
    { name: '山水', groupName: '题材' },
    { name: '花鸟', groupName: '题材' },
  ];
  for (const t of tags) {
    await prisma.dictTag.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log('✅ 标签已插入 (20个, 4组)');

  // 5. 初始贵金属市价
  const silver = await prisma.dictMaterial.findUnique({ where: { name: '银' } });
  const gold18k = await prisma.dictMaterial.findUnique({ where: { name: '18K金' } });
  const today = new Date().toISOString().split('T')[0];

  if (silver) {
    await prisma.metalPrice.create({
      data: { materialId: silver.id, pricePerGram: 25, effectiveDate: today },
    });
  }
  if (gold18k) {
    await prisma.metalPrice.create({
      data: { materialId: gold18k.id, pricePerGram: 780, effectiveDate: today },
    });
  }
  console.log('✅ 贵金属初始市价已插入 (2条)');

  // 6. 示例供应商
  const suppliers = [
    { name: '云南瑞丽翡翠行', contact: '张经理 13800001111', notes: '长期合作，主供翡翠' },
    { name: '广州华林银饰批发', contact: '李总 13900002222', notes: '银饰批发' },
    { name: '东海水晶城', contact: '王姐 13700003333', notes: '水晶手串类' },
  ];
  for (const s of suppliers) {
    await prisma.supplier.create({ data: s });
  }
  console.log('✅ 示例供应商已插入 (3条)');

  console.log('🎉 种子数据完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
